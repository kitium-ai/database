/**
 * PostgreSQL database adapter implementation
 * Implements IDatabaseAdapter for PostgreSQL using Prisma
 */

import { InternalError, toKitiumError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

import type { IDatabaseAdapter, IRetryStrategy } from '../../../core/interfaces';
import { RetryCoordinator } from '../../../core/services/connection/retry-coordinator';
import type { PrismaClientInstance } from '../../../shared/prisma';
import type { DatabaseConfig, HealthReport } from '../../../types';
import { PostgresHealthCheck } from './postgres-health-check';
import { PrismaClientFactory, PrismaClientWrapper } from './prisma-client-wrapper';

const SOURCE = '@kitiumai/database';

/**
 * PostgreSQL adapter implementing IDatabaseAdapter
 */
export class PostgresAdapter implements IDatabaseAdapter {
  readonly name = 'postgres';
  private readonly clientWrapper: PrismaClientWrapper;
  private readonly retryCoordinator: RetryCoordinator;
  private healthCheckProvider: PostgresHealthCheck | null = null;
  private readonly logger: ReturnType<typeof getLogger>;

  constructor(
    retryStrategy?: IRetryStrategy,
  ) {
    const baseLogger = getLogger();
    this.logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'postgres-adapter' })
      : baseLogger;

    // Initialize retry coordinator with strategy
    const finalStrategy: IRetryStrategy = retryStrategy ?? {
      calculateDelay: (attempt: number, baseDelay: number) => baseDelay * 2 ** attempt,
      shouldRetry: (attempt: number, maxRetries: number) => attempt < maxRetries,
    };
    this.retryCoordinator = new RetryCoordinator(finalStrategy);

    // Initialize client wrapper
    const factory = new PrismaClientFactory();
    this.clientWrapper = new PrismaClientWrapper(factory);
  }

  /**
   * Connect to PostgreSQL database with retry logic
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
          this.logger.warn('PostgreSQL connection failed, retrying', { attempt, error: errorMessage });
        },
      };

      await this.retryCoordinator.execute(
        async () => {
          this.logger.debug('Attempting PostgreSQL connection');
          const client = this.clientWrapper.getOrCreate(config as DatabaseConfig);
          await client.$connect();
          this.logger.info('PostgreSQL connection established');
        },
        retryOptions
      );

      // Initialize health check after successful connection
      const client = this.clientWrapper.getClient();
      if (client) {
        const timeoutMs = config.observability?.timeoutMs ?? 5000;
        this.healthCheckProvider = new PostgresHealthCheck(client, timeoutMs);
      }
    } catch (error) {
      const kitiumError = toKitiumError(error, {
        code: 'database/postgres_connection_failed',
        message: 'Failed to connect to PostgreSQL database',
        severity: 'error',
        kind: 'dependency',
        retryable: true,
        source: SOURCE,
      });
      this.logger.error('PostgreSQL connection failed', {}, kitiumError);
      throw kitiumError;
    }
  }

  /**
   * Disconnect from PostgreSQL database
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.debug('Disconnecting from PostgreSQL');
      await this.clientWrapper.disconnect();
      this.healthCheckProvider = null;
      this.logger.info('PostgreSQL disconnected');
    } catch (error) {
      const kitiumError = toKitiumError(error, {
        code: 'database/postgres_disconnect_failed',
        message: 'Failed to disconnect from PostgreSQL database',
        severity: 'warning',
        kind: 'internal',
        retryable: false,
        source: SOURCE,
      });
      this.logger.error('PostgreSQL disconnection failed', {}, kitiumError);
    }
  }

  /**
   * Execute query on PostgreSQL
   * @param query SQL query
   * @param params Query parameters
   * @returns Query result
   */
  query<T = unknown>(_query: string, _params?: unknown[]): Promise<T> {
    this.getClient();
    try {
      // For now, return empty result
      // Real implementation would execute query using client.$queryRaw
      return Promise.resolve({} as T);
    } catch (error) {
      const kitiumError = toKitiumError(error, {
        code: 'database/postgres_query_failed',
        message: 'PostgreSQL query execution failed',
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
   * Check PostgreSQL health
   * @returns Health report
   */
  healthCheck(): Promise<HealthReport> {
    if (!this.healthCheckProvider) {
      return Promise.resolve({
        service: 'postgres',
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
   * Get Prisma client instance
   * @returns PrismaClient
   * @throws Error if not connected
   */
  getClient(): PrismaClientInstance {
    const client = this.clientWrapper.getClient();
    if (!client) {
      throw new InternalError({
        code: 'database/postgres_not_initialized',
        message: 'PostgreSQL adapter not initialized. Call connect() first.',
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
