/**
 * Database configuration types
 */

/**
 * Connection pool configuration
 */
export interface PoolingConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  maxUses?: number;
  reapIntervalMillis?: number;
  idleInTransactionSessionTimeoutMillis?: number;
  allowExitOnIdle?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
}

export interface ObservabilityOptions {
  enableMetrics?: boolean;
  enableTracing?: boolean;
  loggerName?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface ShutdownConfig {
  gracefulTimeoutMs?: number;
  waitForRequests?: () => Promise<void>;
}

export interface MongoConfig {
  mongodbUrl?: string;
  dbName?: string;
  poolSize?: number;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  databaseUrl?: string;
  pooling?: PoolingConfig;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  retry?: RetryConfig;
  observability?: ObservabilityOptions;
  shutdown?: ShutdownConfig;
  mongo?: MongoConfig;
  unsafeAllowClearDatabase?: boolean;
  defaultAdminPassword?: string;
  passwordHasher?: (password: string) => Promise<string>;
}

/**
 * Migration result
 */
export interface MigrationResult {
  id: string;
  checksum: string;
  finishedAt: Date | null;
  executionTime: number;
  success: boolean;
  logs?: string;
}

/**
 * Seed result
 */
export interface SeedResult {
  success: boolean;
  message: string;
  recordsCreated?: number;
  recordsUpdated?: number;
  errors?: string[];
}

export interface HealthReport {
  service: 'postgres' | 'mongodb';
  status: 'ready' | 'initializing' | 'unhealthy';
  details?: Record<string, unknown>;
}
