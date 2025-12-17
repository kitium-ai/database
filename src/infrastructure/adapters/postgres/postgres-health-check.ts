/**
 * PostgreSQL health check implementation
 * Provides health status monitoring for PostgreSQL connections
 */

import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

import type { IHealthCheckProvider } from '../../../core/interfaces';
import type { PrismaClientInstance } from '../../../shared/prisma';
import type { HealthReport } from '../../../types';

/**
 * PostgreSQL health check provider
 */
export class PostgresHealthCheck implements IHealthCheckProvider {
  constructor(
    private readonly client: PrismaClientInstance,
    private readonly timeoutMs = 5000
  ) {}

  /**
   * Check PostgreSQL connection health
   * @returns Health report
   */
  async check(): Promise<HealthReport> {
    const baseLogger = getLogger();
    const logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'postgres-health-check' })
      : baseLogger;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error(`Health check timeout after ${this.timeoutMs}ms`));
        }, this.timeoutMs);
      });

      // Race between actual check and timeout
      await Promise.race([
        this.client.$queryRaw`SELECT 1`,
        timeoutPromise,
      ]);

      logger.debug('PostgreSQL health check passed');
      return {
        service: 'postgres',
        status: 'ready',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('PostgreSQL health check failed', { error: errorMessage });
      return {
        service: 'postgres',
        status: 'unhealthy',
        details: {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Ping PostgreSQL connection
   * @throws Error if connection fails
   */
  async ping(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }
}
