/**
 * MongoDB health check implementation
 * Provides health status monitoring for MongoDB connections
 */

import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';
import type { MongoClient } from 'mongodb';

import type { IHealthCheckProvider } from '../../../core/interfaces';
import type { HealthReport } from '../../../types';

/**
 * MongoDB health check provider
 */
export class MongoHealthCheck implements IHealthCheckProvider {
  constructor(
    private readonly client: MongoClient,
    private readonly timeoutMs = 5000
  ) {}

  /**
   * Check MongoDB connection health
   * @returns Health report
   */
  async check(): Promise<HealthReport> {
    const baseLogger = getLogger();
    const logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'mongo-health-check' })
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
        this.client.db('admin').command({ ping: 1 }),
        timeoutPromise,
      ]);

      logger.debug('MongoDB health check passed');
      return {
        service: 'mongodb',
        status: 'ready',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('MongoDB health check failed', { error: errorMessage });
      return {
        service: 'mongodb',
        status: 'unhealthy',
        details: {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Ping MongoDB connection
   * @throws Error if connection fails
   */
  async ping(): Promise<void> {
    await this.client.db('admin').command({ ping: 1 });
  }
}
