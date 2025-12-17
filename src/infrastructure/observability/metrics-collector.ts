/**
 * Metrics collector for database operations
 * Collects and aggregates metrics for queries, connections, and operations
 */

import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

/**
 * Query metric data
 */
export type QueryMetric = {
  operation: string;
  startTime: bigint;
  endTime: bigint;
  duration: number;
  success: boolean;
  timestamp: Date;
};

/**
 * Connection metric data
 */
export type ConnectionMetric = {
  adapter: string;
  connectedAt: Date;
  duration?: number;
  disconnectedAt?: Date;
  success: boolean;
};

/**
 * Aggregated metrics snapshot
 */
export type MetricsSnapshot = {
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
    slowestDuration: number;
  };
  connections: {
    active: number;
    totalAttempts: number;
    successfulConnections: number;
    failedConnections: number;
  };
  timestamp: Date;
};

/**
 * Collects and aggregates database operation metrics
 */
export class MetricsCollector {
  private readonly logger: ReturnType<typeof getLogger>;
  private readonly queryMetrics: QueryMetric[] = [];
  private readonly connectionMetrics: ConnectionMetric[] = [];
  private readonly maxMetricsSize = 10000;

  constructor(private readonly maxAge = 3600000) {
    // 1 hour default retention
    const baseLogger = getLogger();
    this.logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'metrics-collector' })
      : baseLogger;
  }

  /**
   * Record a query metric
   * @param operation Operation name
   * @param startTime Start time in nanoseconds
   * @param endTime End time in nanoseconds
   * @param success Whether operation succeeded
   */
  recordQuery(operation: string, startTime: bigint, endTime: bigint, success: boolean): void {
    const metric: QueryMetric = {
      operation,
      startTime,
      endTime,
      duration: Number(endTime - startTime) / 1_000_000, // Convert to milliseconds
      success,
      timestamp: new Date(),
    };

    this.queryMetrics.push(metric);

    // Cleanup old metrics if size exceeds limit
    if (this.queryMetrics.length > this.maxMetricsSize) {
      this.cleanupOldMetrics();
    }
  }

  /**
   * Record a connection metric
   * @param adapter Adapter name
   * @param success Whether connection succeeded
   * @returns Connection metric ID for tracking disconnection
   */
  recordConnection(adapter: string, success: boolean): number {
    const metric: ConnectionMetric = {
      adapter,
      connectedAt: new Date(),
      success,
    };

    this.connectionMetrics.push(metric);
    return this.connectionMetrics.length - 1;
  }

  /**
   * Record a disconnection
   * @param metricIndex Connection metric index
   */
  recordDisconnection(metricIndex: number): void {
    if (metricIndex >= 0 && metricIndex < this.connectionMetrics.length) {
      const metric = this.connectionMetrics[metricIndex];
      if (!metric) {
        return;
      }
      metric.disconnectedAt = new Date();
      metric.duration = metric.disconnectedAt.getTime() - metric.connectedAt.getTime();
    }
  }

  /**
   * Get current metrics snapshot
   * @returns Metrics snapshot
   */
  getSnapshot(): MetricsSnapshot {
    const now = Date.now();
    const validQueries = this.queryMetrics.filter((m) => now - m.timestamp.getTime() < this.maxAge);
    const validConnections = this.connectionMetrics.filter((m) => now - m.connectedAt.getTime() < this.maxAge);

    const successfulQueries = validQueries.filter((q) => q.success);
    const failedQueries = validQueries.filter((q) => !q.success);
    const avgDuration = validQueries.length > 0
      ? validQueries.reduce((sum, q) => sum + q.duration, 0) / validQueries.length
      : 0;
    const slowestDuration = validQueries.length > 0
      ? Math.max(...validQueries.map((q) => q.duration))
      : 0;

    const successfulConnections = validConnections.filter((c) => c.success);
    const failedConnections = validConnections.filter((c) => !c.success);
    const activeConnections = validConnections.filter((c) => !c.disconnectedAt).length;

    return {
      queries: {
        total: validQueries.length,
        successful: successfulQueries.length,
        failed: failedQueries.length,
        averageDuration: avgDuration,
        slowestDuration: slowestDuration,
      },
      connections: {
        active: activeConnections,
        totalAttempts: validConnections.length,
        successfulConnections: successfulConnections.length,
        failedConnections: failedConnections.length,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get metrics for specific operation
   * @param operation Operation name
   * @returns Operation metrics
   */
  getOperationMetrics(operation: string): {
    count: number;
    successful: number;
    failed: number;
    averageDuration: number;
  } {
    const now = Date.now();
    const metrics = this.queryMetrics.filter(
      (m) => m.operation === operation && now - m.timestamp.getTime() < this.maxAge
    );

    const successful = metrics.filter((m) => m.success).length;
    const failed = metrics.filter((m) => !m.success).length;
    const averageDuration = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
      : 0;

    return {
      count: metrics.length,
      successful,
      failed,
      averageDuration,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.queryMetrics.length = 0;
    this.connectionMetrics.length = 0;
    this.logger.debug('Metrics collector cleared');
  }

  /**
   * Cleanup old metrics based on max age
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const beforeSize = this.queryMetrics.length;

    // Remove old query metrics
    while (this.queryMetrics.length > 0) {
      const first = this.queryMetrics[0];
      if (!first || now - first.timestamp.getTime() <= this.maxAge) {
        break;
      }
      this.queryMetrics.shift();
    }

    // Remove old connection metrics
    while (this.connectionMetrics.length > 0) {
      const first = this.connectionMetrics[0];
      if (!first || now - first.connectedAt.getTime() <= this.maxAge) {
        break;
      }
      this.connectionMetrics.shift();
    }

    const afterSize = this.queryMetrics.length;
    if (beforeSize !== afterSize) {
      this.logger.debug('Cleaned up old metrics', { before: beforeSize, after: afterSize });
    }
  }

  /**
   * Get raw query metrics
   * @returns Array of query metrics
   */
  getQueryMetrics(): QueryMetric[] {
    return [...this.queryMetrics];
  }

  /**
   * Get raw connection metrics
   * @returns Array of connection metrics
   */
  getConnectionMetrics(): ConnectionMetric[] {
    return [...this.connectionMetrics];
  }
}
