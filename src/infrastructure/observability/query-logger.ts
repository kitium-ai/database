/**
 * Query logger for database operation logging
 * Logs queries with context and performance information
 */

import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

import type { MetricsCollector } from './metrics-collector';

/**
 * Query logging context
 */
export type QueryContext = {
  query: string;
  params?: unknown[];
  operation?: string;
  adapter?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  rowsAffected?: number;
  error?: Error;
};

/**
 * Logs database queries with performance metrics
 */
export class QueryLogger {
  private readonly logger: ReturnType<typeof getLogger>;
  private readonly slowQueryThreshold: number; // milliseconds

  constructor(
    metricsCollector?: MetricsCollector,
    slowQueryThreshold = 1000
  ) {
    void metricsCollector;
    const baseLogger = getLogger();
    this.logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'query-logger' })
      : baseLogger;

    this.slowQueryThreshold = slowQueryThreshold;
  }

  /**
   * Log a query execution
   * @param context Query context
   */
  logQuery(context: QueryContext): void {
    const { query, operation, adapter, duration, rowsAffected, error } = context;

    if (error) {
      this.logger.error('Query execution failed', {
        query: this.sanitizeQuery(query),
        operation,
        adapter,
        duration,
        error: error.message,
      });
      return;
    }

    if (duration && duration > this.slowQueryThreshold) {
      this.logger.warn('Slow query detected', {
        query: this.sanitizeQuery(query),
        operation,
        adapter,
        duration,
        rowsAffected,
      });
      return;
    }

    this.logger.debug('Query executed', {
      query: this.sanitizeQuery(query),
      operation,
      adapter,
      duration,
      rowsAffected,
    });
  }

  /**
   * Log a connection event
   * @param adapter Adapter name
   * @param type Event type
   * @param duration Duration in milliseconds
   * @param error Connection error if any
   */
  logConnection(adapter: string, type: 'connect' | 'disconnect', duration?: number, error?: Error): void {
    if (error) {
      this.logger.error(`Connection ${type} failed`, { adapter, duration, error: error.message });
      return;
    }

    this.logger.info(`Connection ${type} successful`, { adapter, duration });
  }

  /**
   * Log a health check event
   * @param adapter Adapter name
   * @param status Health status
   * @param duration Duration in milliseconds
   * @param error Error if any
   */
  logHealthCheck(adapter: string, status: 'ready' | 'unhealthy', duration?: number, error?: Error): void {
    if (status === 'unhealthy') {
      this.logger.warn('Health check failed', { adapter, duration, error: error?.message });
      return;
    }

    this.logger.debug('Health check passed', { adapter, duration });
  }

  /**
   * Log a migration event
   * @param type Migration type
   * @param count Number of migrations
   * @param duration Duration in milliseconds
   * @param error Error if any
   */
  logMigration(type: 'apply' | 'rollback', count: number, duration?: number, error?: Error): void {
    if (error) {
      this.logger.error(`Migration ${type} failed`, { count, duration, error: error.message });
      return;
    }

    this.logger.info(`Migration ${type} completed`, { count, duration });
  }

  /**
   * Log a seeding event
   * @param strategy Strategy name
   * @param stats Seeding statistics
   * @param error Error if any
   */
  logSeeding(strategy: string, stats: { created?: number; updated?: number; errors?: number }, error?: Error): void {
    if (error) {
      this.logger.error('Seeding failed', { strategy, error: error.message });
      return;
    }

    this.logger.info('Seeding completed', { strategy, ...stats });
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   * @param query Query to sanitize
   * @returns Sanitized query
   */
  private sanitizeQuery(query: string): string {
    // Remove common sensitive patterns
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '***'")
      .replace(/api[_-]?key\s*=\s*'[^']*'/gi, "api_key = '***'");
  }

  /**
   * Set slow query threshold
   * @param threshold Threshold in milliseconds
   */
  setSlowQueryThreshold(threshold: number): void {
    Object.defineProperty(this, 'slowQueryThreshold', {
      value: threshold,
      writable: false,
    });
  }

  /**
   * Get current slow query threshold
   * @returns Threshold in milliseconds
   */
  getSlowQueryThreshold(): number {
    return this.slowQueryThreshold;
  }
}
