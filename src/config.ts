import { ValidationError } from '@kitiumai/error';

import type {
  DatabaseConfig,
  MongoConfig,
  ObservabilityOptions,
  PoolingConfig,
  RetryConfig,
  ShutdownConfig,
} from './types';

const DEFAULT_RETRY: Required<RetryConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
};

const DEFAULT_POOLING: Required<PoolingConfig> = {
  min: 2,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  maxUses: 7_500,
  reapIntervalMillis: 1_000,
  idleInTransactionSessionTimeoutMillis: 60_000,
  allowExitOnIdle: true,
};

type LogLevel = NonNullable<DatabaseConfig['logLevel']>;

function getEnvironmentNumber(environmentKey: string, defaultValue: number): number {
  const value = process.env[environmentKey];
  return value ? Number(value) : defaultValue;
}

function loadRetryConfig(overrides: Partial<DatabaseConfig>): RetryConfig {
  const retry = overrides.retry;
  return {
    maxRetries: getEnvironmentNumber('DATABASE_MAX_RETRIES', retry?.maxRetries ?? DEFAULT_RETRY.maxRetries),
    retryDelay: getEnvironmentNumber('DATABASE_RETRY_DELAY', retry?.retryDelay ?? DEFAULT_RETRY.retryDelay),
  };
}

function getPoolingNumber(
  environmentKey: string,
  overrideValue: number | undefined,
  defaultValue: number
): number {
  return getEnvironmentNumber(environmentKey, overrideValue ?? defaultValue);
}

function loadPoolingConfig(overrides: Partial<DatabaseConfig>): PoolingConfig {
  const pooling = overrides.pooling;
  return {
    min: getPoolingNumber('DATABASE_POOL_MIN', pooling?.min, DEFAULT_POOLING.min),
    max: getPoolingNumber('DATABASE_POOL_MAX', pooling?.max, DEFAULT_POOLING.max),
    idleTimeoutMillis: getPoolingNumber(
      'DATABASE_POOL_IDLE_TIMEOUT',
      pooling?.idleTimeoutMillis,
      DEFAULT_POOLING.idleTimeoutMillis
    ),
    connectionTimeoutMillis: getPoolingNumber(
      'DATABASE_POOL_CONNECTION_TIMEOUT',
      pooling?.connectionTimeoutMillis,
      DEFAULT_POOLING.connectionTimeoutMillis
    ),
    idleInTransactionSessionTimeoutMillis: getPoolingNumber(
      'DATABASE_POOL_IDLE_IN_TRANSACTION',
      pooling?.idleInTransactionSessionTimeoutMillis,
      DEFAULT_POOLING.idleInTransactionSessionTimeoutMillis
    ),
    maxUses: getPoolingNumber('DATABASE_POOL_MAX_USES', pooling?.maxUses, DEFAULT_POOLING.maxUses),
    reapIntervalMillis: getPoolingNumber(
      'DATABASE_POOL_REAP_INTERVAL',
      pooling?.reapIntervalMillis,
      DEFAULT_POOLING.reapIntervalMillis
    ),
    allowExitOnIdle:
      pooling?.allowExitOnIdle ?? process.env['DATABASE_POOL_ALLOW_EXIT_ON_IDLE'] !== 'false',
  };
}

function loadObservabilityConfig(
  overrides: Partial<DatabaseConfig>,
  baseLogLevel: LogLevel
): ObservabilityOptions {
  const observability = overrides.observability;
  return {
    enableMetrics:
      observability?.enableMetrics ?? process.env['DATABASE_ENABLE_METRICS'] !== 'false',
    enableTracing:
      observability?.enableTracing ?? process.env['DATABASE_ENABLE_TRACING'] === 'true',
    loggerName: observability?.loggerName ?? 'kitiumai-database',
    logLevel: observability?.logLevel ?? baseLogLevel,
  };
}

function loadMongoConfig(overrides: Partial<DatabaseConfig>): MongoConfig {
  const mongoUrl = overrides.mongo?.mongodbUrl ?? process.env['MONGODB_URL'];
  return {
    ...(mongoUrl ? { mongodbUrl: mongoUrl } : {}),
    dbName: overrides.mongo?.dbName ?? process.env['MONGODB_DB'] ?? 'kitiumai',
    poolSize: overrides.mongo?.poolSize ?? getEnvironmentNumber('MONGODB_POOL_SIZE', 20),
  };
}

function resolveBaseLogLevel(overrides: Partial<DatabaseConfig>): LogLevel {
  const environmentLevel = process.env['DATABASE_LOG_LEVEL'] as LogLevel | undefined;
  return overrides.logLevel ?? environmentLevel ?? 'info';
}

export function loadDatabaseConfig(overrides: Partial<DatabaseConfig> = {}): DatabaseConfig {
  const dbUrl = overrides.databaseUrl ?? process.env['DATABASE_URL'];
  const baseLogLevel = resolveBaseLogLevel(overrides);
  const shutdownConfig = buildShutdownConfig(overrides);

  const mongoConfig = loadMongoConfig(overrides);
  const config: Partial<DatabaseConfig> = {
    ...(mongoConfig.mongodbUrl ? { mongo: mongoConfig } : {}),
    enableLogging: overrides.enableLogging ?? process.env['DATABASE_ENABLE_LOGGING'] === 'true',
    logLevel: baseLogLevel,
    observability: loadObservabilityConfig(overrides, baseLogLevel),
    shutdown: shutdownConfig,
    retry: loadRetryConfig(overrides),
    pooling: loadPoolingConfig(overrides),
    unsafeAllowClearDatabase:
      overrides.unsafeAllowClearDatabase ?? process.env['ALLOW_CLEAR_DATABASE'] === 'true',
    defaultAdminPassword:
      overrides.defaultAdminPassword ?? process.env['DEFAULT_ADMIN_PASSWORD'] ?? 'ChangeMe!123',
    ...(overrides.passwordHasher ? { passwordHasher: overrides.passwordHasher } : {}),
  };

  if (dbUrl) {
    config.databaseUrl = dbUrl;
  }

  return config as DatabaseConfig;
}

function buildShutdownConfig(overrides: Partial<DatabaseConfig>): ShutdownConfig {
  return {
    gracefulTimeoutMs:
      overrides.shutdown?.gracefulTimeoutMs ??
      getEnvironmentNumber('DATABASE_SHUTDOWN_TIMEOUT', 5000),
    ...(overrides.shutdown?.waitForRequests
      ? { waitForRequests: overrides.shutdown.waitForRequests }
      : {}),
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
