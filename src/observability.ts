import type { ObservabilityOptions } from './types';
import { timeInMs } from './utils';

interface QueryMetric {
  durationMs: number;
  success: boolean;
  operation?: string;
}

const metrics: QueryMetric[] = [];
let options: ObservabilityOptions = { loggerName: 'kitiumai-database', enableMetrics: true };

export function configureObservability(newOptions?: ObservabilityOptions): void {
  options = { ...options, ...newOptions };
}

export function logStructured(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
  const payload = { ts: new Date().toISOString(), level, service: options.loggerName || 'database', message, ...meta };
  // eslint-disable-next-line no-console
  console[level](JSON.stringify(payload));
}

export function recordQueryMetric(start: bigint, end: bigint, operation?: string, success: boolean = true): void {
  if (!options.enableMetrics) return;
  metrics.push({ durationMs: timeInMs(start, end), success, operation });
  if (metrics.length > 1000) {
    metrics.shift();
  }
}

export function getMetricsSnapshot(): Record<string, unknown> {
  const durations = metrics.map((m) => m.durationMs);
  const average = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const p95 = durations.length
    ? durations
        .slice()
        .sort((a, b) => a - b)[Math.floor(0.95 * (durations.length - 1))]
    : 0;

  return {
    totalQueries: metrics.length,
    failures: metrics.filter((m) => !m.success).length,
    averageDurationMs: Number(average.toFixed(2)),
    p95DurationMs: Number(p95?.toFixed(2) || 0),
  };
}
