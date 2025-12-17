/**
 * Prisma client initialization and management (Legacy Facade)
 * @deprecated Use PostgresAdapter from the new architecture instead
 * This file will be removed in v2.0.0
 */

import { InternalError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';
import { timeout } from '@kitiumai/utils-ts';

import { PostgresAdapter } from '../infrastructure/adapters/postgres/postgres.adapter';
import { ExponentialBackoffStrategy } from '../infrastructure/retry/exponential-backoff.strategy';
import { configureObservability, getMetricsSnapshot } from '../observability';
import type { PrismaClientInstance,PrismaSql } from '../shared/prisma';
import type { DatabaseConfig, HealthReport } from '../types';

let postgresAdapter: PostgresAdapter | null = null;
let isShutdownRegistered = false;
let isShuttingDown = false;

const baseLogger = getLogger();
const logger: ReturnType<typeof getLogger> =
  'child' in baseLogger && typeof baseLogger.child === 'function'
    ? (baseLogger as IAdvancedLogger).child({ component: 'database-client' })
    : baseLogger;

function registerShutdownHandlers(config: DatabaseConfig): void {
  if (isShutdownRegistered) {
    return;
  }

  isShutdownRegistered = true;
  const handleSignal = async (signal: NodeJS.Signals): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    logger.warn('Received shutdown signal', { signal });
    await disconnectDatabase({
      isWaitingForGraceful: true,
      ...(config.shutdown?.gracefulTimeoutMs !== undefined
        ? { timeoutMs: config.shutdown.gracefulTimeoutMs }
        : {}),
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on('SIGINT', handleSignal);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on('SIGTERM', handleSignal);
}

/**
 * Initialize the database client with connection pooling
 * @deprecated Use PostgresAdapter.connect() instead
 */
export async function initializeDatabase(
  config: Partial<DatabaseConfig> = {}
): Promise<PrismaClientInstance> {
  if (postgresAdapter) {
    return postgresAdapter.getClient();
  }

  const resolvedConfig = { ...config } as DatabaseConfig;

  // Configure observability
  configureObservability(resolvedConfig.observability);

  // Create adapter with exponential backoff strategy
  postgresAdapter = new PostgresAdapter(new ExponentialBackoffStrategy());

  try {
    await postgresAdapter.connect(resolvedConfig);
    registerShutdownHandlers(resolvedConfig);
    return postgresAdapter.getClient();
  } catch (error) {
    postgresAdapter = null;
    throw error;
  }
}

/**
 * Get the Prisma client instance
 * @deprecated Use PostgresAdapter.getClient() instead
 */
export function getDatabase(): PrismaClientInstance {
  if (!postgresAdapter?.isConnected()) {
    throw new InternalError({
      code: 'database/not_initialized',
      message: 'Prisma client not initialized. Call initializeDatabase() first.',
      severity: 'error',
      retryable: false,
    });
  }
  return postgresAdapter.getClient();
}

/**
 * Disconnect from the database
 * @deprecated Use PostgresAdapter.disconnect() instead
 */
export async function disconnectDatabase(
  options: { isWaitingForGraceful?: boolean; timeoutMs?: number } = {}
): Promise<void> {
  if (!postgresAdapter) {
    return;
  }

  const { isWaitingForGraceful = false, timeoutMs = 5000 } = options;

  const disconnectPromise = postgresAdapter.disconnect();
  const timed = isWaitingForGraceful
    ? timeout(disconnectPromise, timeoutMs, 'Database disconnect timeout')
    : disconnectPromise;

  try {
    await timed;
  } catch (error) {
    logger.warn('Database disconnect timeout or error', error instanceof Error ? error : undefined);
  }

  postgresAdapter = null;
  logger.info('Database connection closed');
}

/**
 * Execute a raw SQL query
 * @deprecated Use PostgresAdapter.query() instead
 */
export function executeQuery<T = unknown>(
  query: PrismaSql,
  _operation?: string
): Promise<T[]> {
  const db = getDatabase();
  return db.$queryRaw<T[]>(query);
}

/**
 * Execute a raw SQL query without parameter safety. Prefer executeQuery.
 * @deprecated Use PostgresAdapter.query() instead
 */
export function executeUnsafeQuery<T = unknown>(
  query: string,
  params?: unknown[]
): Promise<T[]> {
  const db = getDatabase();
  return db.$queryRawUnsafe<T[]>(query, ...(params ?? []));
}

/**
 * Health check for database connectivity
 * @deprecated Use PostgresAdapter.healthCheck() instead
 */
export async function healthCheck(): Promise<boolean> {
  try {
    if (!postgresAdapter?.isConnected()) {
      return false;
    }
    const db = getDatabase();
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error(
      'Database health check failed',
      undefined,
      error instanceof Error ? error : undefined
    );
    return false;
  }
}

/**
 * Get readiness check status
 * @deprecated Use PostgresAdapter.healthCheck() instead
 */
export async function readinessCheck(): Promise<HealthReport> {
  if (!postgresAdapter?.isConnected()) {
    return {
      service: 'postgres',
      status: 'unhealthy',
      details: { error: 'Database not initialized' },
    };
  }

  try {
    const db = getDatabase();
    await db.$queryRaw`SELECT 1`;
    return { service: 'postgres', status: 'ready' };
  } catch (error) {
    return {
      service: 'postgres',
      status: 'unhealthy',
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Get database metrics snapshot
 * @deprecated Use metrics service instead
 */
export function databaseMetrics(): Record<string, unknown> {
  return getMetricsSnapshot();
}
