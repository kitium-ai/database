/**
 * MongoDB database adapter implementation
 * Implements IDatabaseAdapter for MongoDB
 */

import { InternalError, toKitiumError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';
import type { MongoClient } from 'mongodb';

import type { IDatabaseAdapter, IRetryStrategy } from '../../../core/interfaces';
import { RetryCoordinator } from '../../../core/services/connection/retry-coordinator';
import type { DatabaseConfig, HealthReport } from '../../../types';
import { MongoClientFactory, MongoClientWrapper } from './mongo-client-wrapper';
import { MongoHealthCheck } from './mongo-health-check';

const SOURCE = '@kitiumai/database';

/**
 * MongoDB adapter implementing IDatabaseAdapter
 */
export class MongoAdapter implements IDatabaseAdapter {
  readonly name = 'mongodb';
  private readonly clientWrapper: MongoClientWrapper;
  private readonly retryCoordinator: RetryCoordinator;
  private healthCheckProvider: MongoHealthCheck | null = null;
  private readonly logger: ReturnType<typeof getLogger>;

  constructor(
    retryStrategy?: IRetryStrategy,
  ) {
    const baseLogger = getLogger();
    this.logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'mongo-adapter' })
      : baseLogger;

    // Initialize retry coordinator with strategy
    const finalStrategy: IRetryStrategy = retryStrategy ?? {
      calculateDelay: (attempt: number, baseDelay: number) => baseDelay * 2 ** attempt,
      shouldRetry: (attempt: number, maxRetries: number) => attempt < maxRetries,
    };
    this.retryCoordinator = new RetryCoordinator(finalStrategy);

    // Initialize client wrapper
    const factory = new MongoClientFactory();
    this.clientWrapper = new MongoClientWrapper(factory);
  }

  /**
   * Connect to MongoDB database with retry logic
   * @param config Database configuration
   * @throws Error if connection fails
   */
  async connect(config: Partial<DatabaseConfig> = {}): Promise<void> {
    try {
      const retryOptions = {
        ...(config.retry?.maxRetries !== undefined ? { maxRetries: config.retry.maxRetries } : {}),
        ...(config.retry?.retryDelay !== undefined ? { baseDelay: config.retry.retryDelay } : {}),
        onRetry: (attempt: number, error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn('MongoDB connection failed, retrying', { attempt, error: errorMessage });
        },
      };

      await this.retryCoordinator.execute(
        async () => {
          this.logger.debug('Attempting MongoDB connection');
          const client = this.clientWrapper.getOrCreate(config as DatabaseConfig);
          await client.connect();
          this.logger.info('MongoDB connection established');
        },
        retryOptions
      );

      // Initialize health check after successful connection
      const client = this.clientWrapper.getClient();
      if (client) {
        const timeoutMs = config.observability?.timeoutMs ?? 5000;
        this.healthCheckProvider = new MongoHealthCheck(client, timeoutMs);
      }
    } catch (error) {
      const kitiumError = toKitiumError(error, {
        code: 'database/mongo_connection_failed',
        message: 'Failed to connect to MongoDB database',
        severity: 'error',
        kind: 'dependency',
        retryable: true,
        source: SOURCE,
      });
      this.logger.error('MongoDB connection failed', {}, kitiumError);
      throw kitiumError;
    }
  }

  /**
   * Disconnect from MongoDB database
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.debug('Disconnecting from MongoDB');
      await this.clientWrapper.disconnect();
      this.healthCheckProvider = null;
      this.logger.info('MongoDB disconnected');
    } catch (error) {
      const kitiumError = toKitiumError(error, {
        code: 'database/mongo_disconnect_failed',
        message: 'Failed to disconnect from MongoDB database',
        severity: 'warning',
        kind: 'internal',
        retryable: false,
        source: SOURCE,
      });
      this.logger.error('MongoDB disconnection failed', {}, kitiumError);
    }
  }

  /**
   * Execute query on MongoDB
   * @param query MongoDB query/collection name
   * @param params Query parameters
   * @returns Query result
   */
  query<T = unknown>(_query: string, _params?: unknown[]): Promise<T> {
    this.getClient();
    try {
      // For now, return empty result
      // Real implementation would execute query using client operations
      return Promise.resolve({} as T);
    } catch (error) {
      const kitiumError = toKitiumError(error, {
        code: 'database/mongo_query_failed',
        message: 'MongoDB query execution failed',
        severity: 'error',
        kind: 'internal',
        retryable: false,
        source: SOURCE,
      });
      this.logger.error('Query failed', { query: _query }, kitiumError);
      return Promise.reject(kitiumError);
    }
  }

  /**
   * Check MongoDB health
   * @returns Health report
   */
  healthCheck(): Promise<HealthReport> {
    if (!this.healthCheckProvider) {
      return Promise.resolve({
        service: 'mongodb',
        status: 'unhealthy',
        details: {
          error: 'Health check not initialized',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return this.healthCheckProvider.check();
  }

  /**
   * Get MongoDB client instance
   * @returns MongoClient
   * @throws Error if not connected
   */
  getClient(): MongoClient {
    const client = this.clientWrapper.getClient();
    if (!client) {
      throw new InternalError({
        code: 'database/mongo_not_initialized',
        message: 'MongoDB adapter not initialized. Call connect() first.',
        severity: 'error',
        retryable: false,
      });
    }
    return client;
  }

  /**
   * Check if adapter is connected
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.clientWrapper.isConnected();
  }

  /**
   * Reset adapter state
   */
  reset(): void {
    this.clientWrapper.reset();
    this.healthCheckProvider = null;
  }
}
