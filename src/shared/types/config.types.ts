/**
 * Segregated configuration types for different concerns
 * Implements Interface Segregation Principle
 */

import type { ObservabilityOptions, PoolingConfig, RetryConfig, ShutdownConfig } from '../../types';

/**
 * Connection configuration shared by all database adapters
 */
export type IConnectionConfig = {
  retry?: RetryConfig;
  observability?: ObservabilityOptions;
  shutdown?: ShutdownConfig;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
};

/**
 * PostgreSQL-specific configuration
 */
export type IPostgresConfig = IConnectionConfig & {
  databaseUrl: string;
  pooling?: PoolingConfig;
};

/**
 * MongoDB-specific configuration
 */
export type IMongoConfig = IConnectionConfig & {
  mongodbUrl: string;
  dbName?: string;
  poolSize?: number;
};

/**
 * Seed-specific configuration
 */
export type ISeedConfig = {
  unsafeAllowClearDatabase?: boolean;
  defaultAdminPassword?: string;
  passwordHasher?: (password: string) => Promise<string>;
};

/**
 * Health check configuration
 */
export type IHealthCheckConfig = {
  timeoutMs?: number;
  service: 'postgres' | 'mongodb';
};

/**
 * Utility type to check if config is for PostgreSQL
 */
export function isPostgresConfig(config: IConnectionConfig): config is IPostgresConfig {
  return 'databaseUrl' in config && typeof config.databaseUrl === 'string';
}

/**
 * Utility type to check if config is for MongoDB
 */
export function isMongoConfig(config: IConnectionConfig): config is IMongoConfig {
  return 'mongodbUrl' in config && typeof config.mongodbUrl === 'string';
}
