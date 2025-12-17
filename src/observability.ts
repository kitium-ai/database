import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

import type { ObservabilityOptions } from './types';
import { timeInMs } from './utils';

const baseLogger = getLogger();
const logger: ReturnType<typeof getLogger> =
  'child' in baseLogger && typeof baseLogger.child === 'function'
    ? (baseLogger as IAdvancedLogger).child({ component: 'database-observability' })
    : baseLogger;

type QueryMetric = {
  durationMs: number;
  success: boolean;
  operation?: string;
}

const metrics: QueryMetric[] = [];
let options: ObservabilityOptions = { loggerName: 'kitiumai-database', enableMetrics: true };

export function configureObservability(newOptions?: ObservabilityOptions): void {
  options = { ...options, ...newOptions };
}

export function logStructured(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>
): void {
  // Use the structured logger instead of console
  const contextLogger = getContextLogger(meta);

  switch (level) {
    case 'debug':
      contextLogger.debug(message, meta);
      break;
    case 'info':
      contextLogger.info(message, meta);
      break;
    case 'warn':
      contextLogger.warn(message, meta);
      break;
    case 'error':
      contextLogger.error(message, meta);
      break;
  }
}

function getContextLogger(meta?: Record<string, unknown>): ReturnType<typeof getLogger> {
  if (!meta) {
    return logger;
  }

  if ('child' in logger && typeof logger.child === 'function') {
    return (logger as IAdvancedLogger).child(meta);
  }

  return logger;
}

export function recordQueryMetric(
  start: bigint,
  end: bigint,
  operation?: string,
  success = true
): void {
  if (!options.enableMetrics) {
    return;
  }
  const metric: QueryMetric = {
    durationMs: timeInMs(start, end),
    success,
    ...(operation !== undefined ? { operation } : {}),
  };
  metrics.push(metric);
  if (metrics.length > 1000) {
    metrics.shift();
  }
}

export function getMetricsSnapshot(): Record<string, unknown> {
  const durations = metrics.map((m) => m.durationMs);
  const average = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const p95 = durations.length
    ? durations.slice().sort((a, b) => a - b)[Math.floor(0.95 * (durations.length - 1))]
    : 0;

  return {
    totalQueries: metrics.length,
    failures: metrics.filter((m) => !m.success).length,
    averageDurationMs: Number(average.toFixed(2)),
    p95DurationMs: Number(p95?.toFixed(2) ?? 0),
  };
}
