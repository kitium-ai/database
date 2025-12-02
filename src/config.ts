import { ValidationError } from '@kitiumai/error';
import type { DatabaseConfig, PoolingConfig, RetryConfig } from './types';

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
};

const DEFAULT_POOLING: PoolingConfig = {
  min: 2,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  maxUses: 7_500,
  reapIntervalMillis: 1_000,
  idleInTransactionSessionTimeoutMillis: 60_000,
  allowExitOnIdle: true,
};

export function loadDatabaseConfig(overrides: Partial<DatabaseConfig> = {}): DatabaseConfig {
  const retry: RetryConfig = {
    maxRetries: Number(
      process.env['DATABASE_MAX_RETRIES'] || overrides.retry?.maxRetries || DEFAULT_RETRY.maxRetries
    ),
    retryDelay: Number(
      process.env['DATABASE_RETRY_DELAY'] || overrides.retry?.retryDelay || DEFAULT_RETRY.retryDelay
    ),
  };

  const pooling: PoolingConfig = {
    ...DEFAULT_POOLING,
    ...overrides.pooling,
    min: Number(process.env['DATABASE_POOL_MIN'] || overrides.pooling?.min || DEFAULT_POOLING.min),
    max: Number(process.env['DATABASE_POOL_MAX'] || overrides.pooling?.max || DEFAULT_POOLING.max),
    idleTimeoutMillis: Number(
      process.env['DATABASE_POOL_IDLE_TIMEOUT'] ||
        overrides.pooling?.idleTimeoutMillis ||
        DEFAULT_POOLING.idleTimeoutMillis
    ),
    connectionTimeoutMillis: Number(
      process.env['DATABASE_POOL_CONNECTION_TIMEOUT'] ||
        overrides.pooling?.connectionTimeoutMillis ||
        DEFAULT_POOLING.connectionTimeoutMillis
    ),
    idleInTransactionSessionTimeoutMillis: Number(
      process.env['DATABASE_POOL_IDLE_IN_TRANSACTION'] ||
        overrides.pooling?.idleInTransactionSessionTimeoutMillis ||
        DEFAULT_POOLING.idleInTransactionSessionTimeoutMillis
    ),
    maxUses: Number(
      process.env['DATABASE_POOL_MAX_USES'] || overrides.pooling?.maxUses || DEFAULT_POOLING.maxUses
    ),
    reapIntervalMillis: Number(
      process.env['DATABASE_POOL_REAP_INTERVAL'] ||
        overrides.pooling?.reapIntervalMillis ||
        DEFAULT_POOLING.reapIntervalMillis
    ),
    allowExitOnIdle:
      typeof overrides.pooling?.allowExitOnIdle === 'boolean'
        ? overrides.pooling.allowExitOnIdle
        : process.env['DATABASE_POOL_ALLOW_EXIT_ON_IDLE'] !== 'false',
  };

  const mongoUrl = overrides.mongo?.mongodbUrl || process.env['MONGODB_URL'];
  const dbUrl = overrides.databaseUrl || process.env['DATABASE_URL'];

  return {
    ...overrides,
    ...(dbUrl ? { databaseUrl: dbUrl } : {}),
    mongo: {
      ...(mongoUrl ? { mongodbUrl: mongoUrl } : {}),
      dbName: overrides.mongo?.dbName || process.env['MONGODB_DB'] || 'kitiumai',
      poolSize: overrides.mongo?.poolSize || Number(process.env['MONGODB_POOL_SIZE'] || 20),
    },
    enableLogging: overrides.enableLogging ?? process.env['DATABASE_ENABLE_LOGGING'] === 'true',
    logLevel:
      overrides.logLevel ||
      (process.env['DATABASE_LOG_LEVEL'] as DatabaseConfig['logLevel']) ||
      'info',
    observability: {
      enableMetrics:
        overrides.observability?.enableMetrics ??
        process.env['DATABASE_ENABLE_METRICS'] !== 'false',
      enableTracing:
        overrides.observability?.enableTracing ?? process.env['DATABASE_ENABLE_TRACING'] === 'true',
      loggerName: overrides.observability?.loggerName || 'kitiumai-database',
      logLevel: overrides.observability?.logLevel || overrides.logLevel || 'info',
    },
    shutdown: {
      gracefulTimeoutMs:
        overrides.shutdown?.gracefulTimeoutMs ||
        Number(process.env['DATABASE_SHUTDOWN_TIMEOUT'] || 5000),
      ...(overrides.shutdown?.waitForRequests
        ? { waitForRequests: overrides.shutdown.waitForRequests }
        : {}),
    },
    retry,
    pooling,
    unsafeAllowClearDatabase:
      overrides.unsafeAllowClearDatabase ??
      (process.env['ALLOW_CLEAR_DATABASE'] === 'true' || false),
    defaultAdminPassword:
      overrides.defaultAdminPassword || process.env['DEFAULT_ADMIN_PASSWORD'] || 'ChangeMe!123',
    passwordHasher: overrides.passwordHasher,
  };
}

export function validateDatabaseConfig(config: DatabaseConfig): void {
  if (!config.databaseUrl) {
    throw new ValidationError({
      code: 'database/missing_url',
      message: 'DATABASE_URL is required for PostgreSQL operations.',
      severity: 'error',
      retryable: false,
    });
  }

  if (!config.pooling) {
    throw new ValidationError({
      code: 'database/missing_pooling',
      message: 'Pooling configuration could not be resolved.',
      severity: 'error',
      retryable: false,
    });
  }
}
