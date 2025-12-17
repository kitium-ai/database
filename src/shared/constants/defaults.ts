/**
 * Default configuration constants
 * Centralized default values for all database configuration
 */

import type { PoolingConfig, RetryConfig } from '../../types';

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY: Required<RetryConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Default connection pooling configuration
 */
export const DEFAULT_POOLING: Required<PoolingConfig> = {
  min: 2,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  maxUses: 7_500,
  reapIntervalMillis: 1_000,
  idleInTransactionSessionTimeoutMillis: 60_000,
  allowExitOnIdle: true,
};

/**
 * Default admin password
 * Should be changed on first login in production
 */
export const DEFAULT_ADMIN_PASSWORD = 'ChangeMe!123';

/**
 * Default MongoDB database name
 */
export const DEFAULT_MONGO_DB_NAME = 'kitiumai';

/**
 * Default MongoDB pool size
 */
export const DEFAULT_MONGO_POOL_SIZE = 20;

/**
 * Default graceful shutdown timeout (milliseconds)
 */
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

/**
 * Default log level
 */
export const DEFAULT_LOG_LEVEL = 'info' as const;

/**
 * Default logger name for database operations
 */
export const DEFAULT_LOGGER_NAME = 'kitiumai-database';

/**
 * Source identifier for errors
 */
export const ERROR_SOURCE = '@kitiumai/database';
