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

/**
 * Database configuration
 */
export interface DatabaseConfig {
  databaseUrl: string;
  mongodbUrl?: string;
  pooling: PoolingConfig;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  maxRetries?: number;
  retryDelay?: number;
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
