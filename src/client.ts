/**
 * Prisma client initialization and management
 */

import { InternalError, toKitiumError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';
import { sleep, timeout } from '@kitiumai/utils-ts';
import { type Prisma,PrismaClient } from '@prisma/client';

import { loadDatabaseConfig, validateDatabaseConfig } from './config';
import {
  configureObservability,
  getMetricsSnapshot,
  recordQueryMetric,
} from './observability';
import { createConnectionPool } from './pooling';
import type { DatabaseConfig, HealthReport } from './types';

let prismaInstance: PrismaClient | null = null;
let isShutdownRegistered = false;
let isShuttingDown = false;

const SOURCE = '@kitiumai/database';

const baseLogger = getLogger();
const logger: ReturnType<typeof getLogger> =
  'child' in baseLogger && typeof baseLogger.child === 'function'
    ? (baseLogger as IAdvancedLogger).child({ component: 'database-client' })
    : baseLogger;

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: DatabaseConfig
): Promise<T> {
  const maxRetries = config.retry?.maxRetries ?? 3;
  const retryDelay = config.retry?.retryDelay ?? 1000;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        break;
      }
      logger.warn('Retrying PostgreSQL connection', {
        attempt: attempt + 1,
        maxRetries,
        error: error instanceof Error ? error : undefined,
      });
      await sleep(retryDelay * 2 ** attempt);
      attempt++;
    }
  }

  throw toKitiumError(lastError, {
    code: 'database/connection_retry_exhausted',
    message: 'Database connection failed after retries',
    severity: 'error',
    kind: 'dependency',
    retryable: false,
    source: SOURCE,
  });
}

/**
 * Initialize the database client with connection pooling
 */
async function initializePooledConnection(
  config: Partial<DatabaseConfig>
): Promise<void> {
  if (prismaInstance) {
    return;
  }

  const resolvedConfig = loadDatabaseConfig(config);
  validateDatabaseConfig(resolvedConfig);
  configureObservability(resolvedConfig.observability);

  const databaseUrl = resolvedConfig.databaseUrl ?? '';
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const poolingConfig = resolvedConfig.pooling!;

  const pooledDatabaseUrl = createConnectionPool(databaseUrl, poolingConfig);

  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: pooledDatabaseUrl,
      },
    },
    log:
      (resolvedConfig.enableLogging ?? process.env['NODE_ENV'] === 'development')
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  try {
    await retryWithBackoff(
      async () => {
        await prismaInstance?.$connect();
      },
      resolvedConfig
    );
    logger.info('Database connection established', {
      pooling: { min: poolingConfig.min, max: poolingConfig.max },
    });
  } catch (error) {
	    const kitiumError = toKitiumError(error, {
	      code: 'database/connection_failed',
	      message: 'Database connection failed',
	      severity: 'error',
	      kind: 'dependency',
	      retryable: true,
	      source: SOURCE,
	    });
	    logger.error('Failed to connect to database', undefined, kitiumError);
	    throw kitiumError;
	  }

  registerShutdownHandlers(resolvedConfig);
}

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

export async function initializeDatabase(
  config: Partial<DatabaseConfig> = {}
): Promise<PrismaClient> {
  if (prismaInstance) {
    return prismaInstance;
  }

  await initializePooledConnection(config);
  return prismaInstance ?? new PrismaClient();
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
  options: { isWaitingForGraceful?: boolean; timeoutMs?: number } = {}
): Promise<void> {
  if (!prismaInstance) {
    return;
  }
  const { isWaitingForGraceful = false, timeoutMs = 5000 } = options;

  const disconnectPromise = prismaInstance.$disconnect();
  const timed = isWaitingForGraceful
    ? timeout(disconnectPromise, timeoutMs, 'Database disconnect timeout')
    : disconnectPromise;

  try {
    await timed;
  } catch (error) {
    logger.warn('Database disconnect timeout or error', error instanceof Error ? error : undefined);
  }
  prismaInstance = null;
  logger.info('Database connection closed');
}

/**
 * Execute a raw SQL query
 */
export async function executeQuery<T = unknown>(
  query: Prisma['Sql'],
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
    const message = operation ? `Query execution failed: ${operation}` : 'Query execution failed';
    const kitiumError = toKitiumError(error, {
      code: 'database/query_failed',
      message,
      severity: 'error',
      kind: 'dependency',
      retryable: true,
      source: SOURCE,
    });
    logger.error('Query execution failed', operation ? { operation } : undefined, kitiumError);
    throw kitiumError;
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
    const result = await db.$queryRawUnsafe<T[]>(query, ...(params ?? []));
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
  } catch (error) {
    logger.error(
      'Database health check failed',
      undefined,
      error instanceof Error ? error : undefined
    );
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
