/**
 * Configuration loader for loading and merging database configurations
 * Eliminates duplication of config loading logic
 */

import type { IConfigProvider } from '../../core/interfaces/config-provider.interface';
import type {
  DatabaseConfig,
  MongoConfig,
  ObservabilityOptions,
  PoolingConfig,
  RetryConfig,
  ShutdownConfig,
} from '../../types';

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

const DEFAULT_ADMIN_PASSWORD = 'ChangeMe!123';

export class ConfigurationLoader {
  constructor(private readonly configProvider: IConfigProvider) {}

  /**
   * Load complete database configuration
   * @param overrides Configuration overrides
   * @returns Complete resolved configuration
   */
  load(overrides: Partial<DatabaseConfig> = {}): DatabaseConfig {
    const databaseUrl = overrides.databaseUrl ?? this.configProvider.get('DATABASE_URL');
    const baseLogLevel = this.resolveBaseLogLevel(overrides);
    const shutdownConfig = this.loadShutdownConfig(overrides);
    const mongoConfig = this.loadMongoConfig(overrides);

    const config: Partial<DatabaseConfig> = {
      ...(mongoConfig.mongodbUrl ? { mongo: mongoConfig } : {}),
      enableLogging: overrides.enableLogging ?? this.configProvider.getBoolean('DATABASE_ENABLE_LOGGING', false),
      logLevel: baseLogLevel,
      observability: this.loadObservabilityConfig(overrides, baseLogLevel),
      shutdown: shutdownConfig,
      retry: this.loadRetryConfig(overrides),
      pooling: this.loadPoolingConfig(overrides),
      unsafeAllowClearDatabase:
        overrides.unsafeAllowClearDatabase ?? this.configProvider.getBoolean('ALLOW_CLEAR_DATABASE', false),
      defaultAdminPassword: overrides.defaultAdminPassword ?? this.configProvider.get('DEFAULT_ADMIN_PASSWORD') ?? DEFAULT_ADMIN_PASSWORD,
      ...(overrides.passwordHasher ? { passwordHasher: overrides.passwordHasher } : {}),
    };

    if (databaseUrl) {
      config.databaseUrl = databaseUrl;
    }

    return config as DatabaseConfig;
  }

  /**
   * Load retry configuration
   * @param overrides Configuration overrides
   * @returns Retry configuration
   */
  private loadRetryConfig(overrides: Partial<DatabaseConfig>): RetryConfig {
    const retry = overrides.retry;
    return {
      maxRetries: this.configProvider.getNumber(
        'DATABASE_MAX_RETRIES',
        retry?.maxRetries ?? DEFAULT_RETRY.maxRetries
      ),
      retryDelay: this.configProvider.getNumber('DATABASE_RETRY_DELAY', retry?.retryDelay ?? DEFAULT_RETRY.retryDelay),
    };
  }

  /**
   * Load pooling configuration
   * @param overrides Configuration overrides
   * @returns Pooling configuration
   */
  private loadPoolingConfig(overrides: Partial<DatabaseConfig>): PoolingConfig {
    const pooling = overrides.pooling;

    const getPoolingNumber = (key: string, override: number | undefined, defaultValue: number): number => {
      return this.configProvider.getNumber(key, override ?? defaultValue);
    };

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
        pooling?.allowExitOnIdle ?? this.configProvider.getBoolean('DATABASE_POOL_ALLOW_EXIT_ON_IDLE', DEFAULT_POOLING.allowExitOnIdle),
    };
  }

  /**
   * Load observability configuration
   * @param overrides Configuration overrides
   * @param baseLogLevel Base log level
   * @returns Observability options
   */
  private loadObservabilityConfig(
    overrides: Partial<DatabaseConfig>,
    baseLogLevel: 'debug' | 'info' | 'warn' | 'error'
  ): ObservabilityOptions {
    const observability = overrides.observability;
    return {
      enableMetrics: observability?.enableMetrics ?? this.configProvider.getBoolean('DATABASE_ENABLE_METRICS', true),
      enableTracing: observability?.enableTracing ?? this.configProvider.getBoolean('DATABASE_ENABLE_TRACING', false),
      loggerName: observability?.loggerName ?? 'kitiumai-database',
      logLevel: observability?.logLevel ?? baseLogLevel,
    };
  }

  /**
   * Load MongoDB configuration
   * @param overrides Configuration overrides
   * @returns MongoDB configuration
   */
  private loadMongoConfig(overrides: Partial<DatabaseConfig>): MongoConfig {
    const mongoUrl = overrides.mongo?.mongodbUrl ?? this.configProvider.get('MONGODB_URL');
    return {
      ...(mongoUrl ? { mongodbUrl: mongoUrl } : {}),
      dbName: overrides.mongo?.dbName ?? this.configProvider.get('MONGODB_DB') ?? 'kitiumai',
      poolSize: overrides.mongo?.poolSize ?? this.configProvider.getNumber('MONGODB_POOL_SIZE', 20),
    };
  }

  /**
   * Resolve base log level
   * @param overrides Configuration overrides
   * @returns Resolved log level
   */
  private resolveBaseLogLevel(overrides: Partial<DatabaseConfig>): 'debug' | 'info' | 'warn' | 'error' {
    const environmentLevel = this.configProvider.get('DATABASE_LOG_LEVEL') as 'debug' | 'info' | 'warn' | 'error' | undefined;
    return overrides.logLevel ?? environmentLevel ?? 'info';
  }

  /**
   * Load shutdown configuration
   * @param overrides Configuration overrides
   * @returns Shutdown configuration
   */
  private loadShutdownConfig(overrides: Partial<DatabaseConfig>): ShutdownConfig {
    return {
      gracefulTimeoutMs:
        overrides.shutdown?.gracefulTimeoutMs ?? this.configProvider.getNumber('DATABASE_SHUTDOWN_TIMEOUT', 5000),
      ...(overrides.shutdown?.waitForRequests ? { waitForRequests: overrides.shutdown.waitForRequests } : {}),
    };
  }
}
