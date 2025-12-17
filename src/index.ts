/**
 * @kitiumai/database
 * Enterprise-ready database package with Prisma ORM
 */

// Legacy exports (backward compatibility)
export { loadDatabaseConfig, validateDatabaseConfig } from './config';
export {
  databaseMetrics,
  executeQuery,
  executeUnsafeQuery,
  getDatabase,
  healthCheck,
  initializeDatabase,
  readinessCheck,
} from './legacy/client';
export {
  disconnectMongoDatabase,
  getMongoDatabase,
  initializeMongoDatabase,
  mongoHealthCheck,
} from './legacy/mongo';
export {
  getMigrationHistory,
  isMigrationsUpToDate,
  migrationRunner,
  rollbackToMigration,
  validateSchema,
} from './migrations';
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

// New architecture exports
export { registerBindings, registerTestBindings } from './application/di/bindings';
export { DIContainer } from './application/di/container';
export { DatabaseAdapterRegistry } from './application/di/registry';
export { DatabaseErrorFactory } from './core/factories/error.factory';
export { LoggerFactory } from './core/factories/logger.factory';
export { type IDatabaseAdapter } from './core/interfaces';
export { type IRetryStrategy } from './core/interfaces';
export { type IConfigProvider } from './core/interfaces';
export { type IHealthCheckProvider } from './core/interfaces';
export { type ICommandExecutor } from './core/interfaces';
export { RetryCoordinator } from './core/services/connection/retry-coordinator';
export { HealthCheckOrchestrator } from './core/services/health/health-check-orchestrator';
export { MigrationExecutor, type MigrationStats } from './core/services/migration/migration-executor';
export { type ClearingStats,DatabaseCleaner } from './core/services/seeding/database-cleaner';
export { type SeedingStats,SeedOrchestrator } from './core/services/seeding/seed-orchestrator';
export { MongoAdapter } from './infrastructure/adapters/mongodb/mongo.adapter';
export { MongoClientFactory } from './infrastructure/adapters/mongodb/mongo-client-wrapper';
export { MongoHealthCheck } from './infrastructure/adapters/mongodb/mongo-health-check';
export { PostgresAdapter } from './infrastructure/adapters/postgres/postgres.adapter';
export { PostgresHealthCheck } from './infrastructure/adapters/postgres/postgres-health-check';
export { PrismaClientFactory } from './infrastructure/adapters/postgres/prisma-client-wrapper';
export { MockCommandExecutor } from './infrastructure/command/mock-command-executor';
export { NodeCommandExecutor } from './infrastructure/command/node-command-executor';
export { ConfigurationLoader } from './infrastructure/config/configuration-loader';
export { ConfigurationValidator } from './infrastructure/config/configuration-validator';
export { EnvironmentConfigProvider } from './infrastructure/config/environment-config-provider';
export { InMemoryConfigProvider } from './infrastructure/config/in-memory-config-provider';
export { type ConnectionMetric,MetricsCollector, type MetricsSnapshot, type QueryMetric } from './infrastructure/observability/metrics-collector';
export { type QueryContext,QueryLogger } from './infrastructure/observability/query-logger';
export { ExponentialBackoffStrategy } from './infrastructure/retry/exponential-backoff.strategy';
export { ExponentialBackoffWithJitterStrategy } from './infrastructure/retry/exponential-backoff-with-jitter.strategy';
export { LinearBackoffStrategy } from './infrastructure/retry/linear-backoff.strategy';
