/**
 * @kitiumai/database
 * Enterprise-ready database package with Prisma ORM
 */

export {
  databaseMetrics,
  executeQuery,
  executeUnsafeQuery,
  getDatabase,
  healthCheck,
  initializeDatabase,
  readinessCheck,
} from './client';
export { createConnectionPool, generatePgBouncerConfig, getPoolingConfigFromEnv } from './pooling';
export type { DatabaseConfig, PoolingConfig, HealthReport, RetryConfig, ObservabilityOptions } from './types';
export { migrationRunner, rollbackToMigration, getMigrationHistory, validateSchema, isMigrationsUpToDate } from './migrations';
export { seedDatabase, clearDatabase } from './seed';
export { loadDatabaseConfig, validateDatabaseConfig } from './config';
export { initializeMongoDatabase, getMongoDatabase, disconnectMongoDatabase, mongoHealthCheck } from './mongo';
export { getMetricsSnapshot, configureObservability, logStructured } from './observability';
