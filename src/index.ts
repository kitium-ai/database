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
export { loadDatabaseConfig, validateDatabaseConfig } from './config';
export {
  getMigrationHistory,
  isMigrationsUpToDate,
  migrationRunner,
  rollbackToMigration,
  validateSchema,
} from './migrations';
export {
  disconnectMongoDatabase,
  getMongoDatabase,
  initializeMongoDatabase,
  mongoHealthCheck,
} from './mongo';
export { configureObservability, getMetricsSnapshot, logStructured } from './observability';
export { createConnectionPool, generatePgBouncerConfig, getPoolingConfigFromEnvironment } from './pooling';
export { clearDatabase, seedDatabase } from './seed';
export type {
  DatabaseConfig,
  HealthReport,
  ObservabilityOptions,
  PoolingConfig,
  RetryConfig,
} from './types';
