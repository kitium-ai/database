/**
 * Prisma client initialization and management
 */

import { PrismaClient } from '@prisma/client';
import { InternalError, ValidationError } from '@kitiumai/error';
import type { DatabaseConfig, PoolingConfig } from './types';
import { createConnectionPool } from './pooling';

let prismaInstance: PrismaClient | null = null;

/**
 * Initialize the database client with connection pooling
 */
export async function initializeDatabase(
  config: Partial<DatabaseConfig> = {}
): Promise<PrismaClient> {
  if (prismaInstance) {
    return prismaInstance;
  }

  const databaseUrl = config.databaseUrl || process.env['DATABASE_URL'];

  if (!databaseUrl) {
    throw new ValidationError({
      code: 'database/missing_url',
      message:
        'DATABASE_URL is not defined. Please set it in your environment variables or pass it to initializeDatabase.',
      severity: 'error',
      retryable: false,
    });
  }

  // Create pooling configuration from environment variables or defaults
  const poolingConfig: PoolingConfig = config.pooling || {
    min: parseInt(process.env['DATABASE_POOL_MIN'] || '2'),
    max: parseInt(process.env['DATABASE_POOL_MAX'] || '10'),
    idleTimeoutMillis: parseInt(process.env['DATABASE_POOL_IDLE_TIMEOUT'] || '30000'),
    connectionTimeoutMillis: parseInt(process.env['DATABASE_POOL_CONNECTION_TIMEOUT'] || '5000'),
    maxUses: 7500,
    reapIntervalMillis: 1000,
    idleInTransactionSessionTimeoutMillis: 60000,
    allowExitOnIdle: true,
  };

  // Add connection pooling to the database URL
  const pooledDatabaseUrl = createConnectionPool(databaseUrl, poolingConfig);

  // Initialize Prisma Client with connection pooling
  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: pooledDatabaseUrl,
      },
    },
    log:
      config.enableLogging || process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  // Connect to the database
  try {
    await prismaInstance.$connect();
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to connect to database');
    throw new InternalError({
      code: 'database/connection_failed',
      message: 'Database connection failed',
      severity: 'error',
      retryable: false,
      cause: error,
    });
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    disconnectDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    disconnectDatabase();
    process.exit(0);
  });

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
export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    console.log('Database connection closed');
  }
}

/**
 * Execute a raw SQL query
 */
export async function executeQuery<T = unknown>(query: string, params?: unknown[]): Promise<T[]> {
  const db = getDatabase();
  return db.$queryRawUnsafe(query, ...(params || []));
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
    console.error('Database health check failed');
    return false;
  }
}
