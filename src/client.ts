/**
 * Prisma client initialization and management
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { InternalError } from '@kitiumai/error';
import { loadDatabaseConfig, validateDatabaseConfig } from './config';
import { createConnectionPool } from './pooling';
import type { DatabaseConfig, HealthReport, PoolingConfig } from './types';
import {
  configureObservability,
  getMetricsSnapshot,
  logStructured,
  recordQueryMetric,
} from './observability';
import { retryWithBackoff } from './utils';

let prismaInstance: PrismaClient | null = null;
let shutdownRegistered = false;
let shuttingDown = false;

/**
 * Initialize the database client with connection pooling
 */
export async function initializeDatabase(
  config: Partial<DatabaseConfig> = {}
): Promise<PrismaClient> {
  if (prismaInstance) {
    return prismaInstance;
  }

  const resolvedConfig = loadDatabaseConfig(config);
  validateDatabaseConfig(resolvedConfig);
  configureObservability(resolvedConfig.observability);

  const databaseUrl = resolvedConfig.databaseUrl!;
  const poolingConfig: PoolingConfig = resolvedConfig.pooling!;

  const pooledDatabaseUrl = createConnectionPool(databaseUrl, poolingConfig);

  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: pooledDatabaseUrl,
      },
    },
    log:
      resolvedConfig.enableLogging || process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  try {
    await retryWithBackoff(() => prismaInstance!.$connect(), {
      ...(resolvedConfig.retry?.maxRetries !== undefined
        ? { retries: resolvedConfig.retry.maxRetries }
        : {}),
      ...(resolvedConfig.retry?.retryDelay !== undefined
        ? { delay: resolvedConfig.retry.retryDelay }
        : {}),
      onRetry: (attempt, error) =>
        logStructured('warn', 'Retrying PostgreSQL connection', {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        }),
    });
    logStructured('info', 'Database connection established', {
      pooling: { min: poolingConfig.min, max: poolingConfig.max },
    });
  } catch (error) {
    logStructured('error', 'Failed to connect to database', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new InternalError({
      code: 'database/connection_failed',
      message: 'Database connection failed',
      severity: 'error',
      retryable: false,
      cause: error,
    });
  }

  if (!shutdownRegistered) {
    shutdownRegistered = true;
    const handleSignal = async (signal: NodeJS.Signals): Promise<void> => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      logStructured('warn', 'Received shutdown signal', { signal });
      await disconnectDatabase({
        wait: true,
        ...(resolvedConfig.shutdown?.gracefulTimeoutMs !== undefined
          ? { timeoutMs: resolvedConfig.shutdown.gracefulTimeoutMs }
          : {}),
      });
    };

    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);
  }

  return prismaInstance;
}

/**
 * Get the Prisma client instance
 */
export function getDatabase(): PrismaClient {
  if (!prismaInstance) {
    throw new InternalError({
      code: 'database/not_initialized',
      message: 'Prisma client not initialized. Call initializeDatabase() first.',
      severity: 'error',
      retryable: false,
    });
  }
  return prismaInstance;
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(
  options: { wait?: boolean; timeoutMs?: number } = {}
): Promise<void> {
  if (!prismaInstance) {
    return;
  }
  const { wait = false, timeoutMs = 5000 } = options;

  const disconnectPromise = prismaInstance.$disconnect();
  const timed = Promise.race([
    disconnectPromise,
    wait ? new Promise((resolve) => setTimeout(resolve, timeoutMs)) : Promise.resolve(),
  ]);

  await timed;
  prismaInstance = null;
  logStructured('info', 'Database connection closed');
}

/**
 * Execute a raw SQL query
 */
export async function executeQuery<T = unknown>(
  query: Prisma.Sql,
  operation?: string
): Promise<T[]> {
  const db = getDatabase();
  const start = process.hrtime.bigint();
  try {
    const result = await db.$queryRaw<T[]>(query);
    recordQueryMetric(start, process.hrtime.bigint(), operation, true);
    return result as T[];
  } catch (error) {
    recordQueryMetric(start, process.hrtime.bigint(), operation, false);
    logStructured('error', 'Query execution failed', {
      error: error instanceof Error ? error.message : String(error),
      operation,
    });
    throw error;
  }
}

/**
 * Execute a raw SQL query without parameter safety. Prefer executeQuery.
 */
export async function executeUnsafeQuery<T = unknown>(
  query: string,
  params?: unknown[]
): Promise<T[]> {
  const db = getDatabase();
  const start = process.hrtime.bigint();
  try {
    const result = await db.$queryRawUnsafe<T[]>(query, ...(params || []));
    recordQueryMetric(start, process.hrtime.bigint(), 'unsafe-query', true);
    return result as T[];
  } catch (error) {
    recordQueryMetric(start, process.hrtime.bigint(), 'unsafe-query', false);
    throw error;
  }
}

/**
 * Health check for database connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    logStructured('error', 'Database health check failed');
    return false;
  }
}

export async function readinessCheck(): Promise<HealthReport> {
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

export function databaseMetrics(): Record<string, unknown> {
  return getMetricsSnapshot();
}
