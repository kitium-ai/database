/**
 * Connection pooling configuration for PostgreSQL
 * Uses PgBouncer-style pooling configuration
 */

import type { PoolingConfig } from './types';

/**
 * Create a pooled database connection URL with PgBouncer configuration
 * This allows for efficient connection management in production environments
 */
export function createConnectionPool(databaseUrl: string, config: PoolingConfig): string {
  // Parse the database URL
  const url = new URL(databaseUrl);

  // Add connection pooling parameters to the URL
  // These parameter names are PostgreSQL/PgBouncer standard and must use snake_case
  /* eslint-disable @typescript-eslint/naming-convention */
  const poolingParams = new URLSearchParams({
    // Connection pool settings
    statement_cache_size: '0', // Disable statement caching for pooling
    max_pool_size: config.max.toString(),
    min_pool_size: config.min.toString(),
    idle_in_transaction_session_timeout: (
      config.idleInTransactionSessionTimeoutMillis || 60000
    ).toString(),
    idle_timeout: config.idleTimeoutMillis.toString(),
    connection_timeout: config.connectionTimeoutMillis.toString(),

    // Performance and reliability settings
    tcp_keepalives_idle: '30',
    tcp_keepalives_interval: '10',
    tcp_keepalives_count: '5',
    application_name: 'kitiumai-database',
  });
  /* eslint-enable @typescript-eslint/naming-convention */

  // Merge existing query parameters with pooling parameters
  const existingParams = url.searchParams;
  for (const [key, value] of existingParams) {
    if (!poolingParams.has(key)) {
      poolingParams.set(key, value);
    }
  }

  url.search = poolingParams.toString();
  return url.toString();
}

/**
 * Generate PgBouncer configuration file content
 * This can be used to set up a PgBouncer proxy for connection pooling
 */
export function generatePgBouncerConfig(
  databaseUrl: string,
  config: PoolingConfig,
  pgBouncerPort: number = 6432
): string {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1) || 'postgres';

  return `
; PgBouncer configuration file for @kitiumai/database
; Generated automatically - do not edit manually

[databases]
${dbName} = host=${url.hostname} port=${url.port || 5432} user=${url.username} password=${url.password} dbname=${dbName}

[pgbouncer]
; Pooling configuration
pool_mode = transaction
max_client_conn = 1000
default_pool_size = ${config.max}
min_pool_size = ${config.min}
reserve_pool_size = ${Math.ceil(config.max * 0.1)}
reserve_pool_timeout = 3

; Timeouts
idle_in_transaction_session_timeout = ${config.idleInTransactionSessionTimeoutMillis || 60000}
server_idle_timeout = ${config.idleTimeoutMillis}
server_connect_timeout = ${config.connectionTimeoutMillis}
query_wait_timeout = 120

; Connection management
server_lifetime = 3600
server_login_retry = 15

; Network configuration
listen_addr = 127.0.0.1
listen_port = ${pgBouncerPort}
unix_socket_dir = /tmp

; Authentication
auth_file = /etc/pgbouncer/userlist.txt
auth_type = md5

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60

; Admin
admin_users = postgres
`;
}

/**
 * Get pooling configuration from environment variables
 */
export function getPoolingConfigFromEnv(): PoolingConfig {
  return {
    min: parseInt(process.env['DATABASE_POOL_MIN'] || '2'),
    max: parseInt(process.env['DATABASE_POOL_MAX'] || '10'),
    idleTimeoutMillis: parseInt(process.env['DATABASE_POOL_IDLE_TIMEOUT'] || '30000'),
    connectionTimeoutMillis: parseInt(process.env['DATABASE_POOL_CONNECTION_TIMEOUT'] || '5000'),
    maxUses: parseInt(process.env['DATABASE_POOL_MAX_USES'] || '7500'),
    reapIntervalMillis: parseInt(process.env['DATABASE_POOL_REAP_INTERVAL'] || '1000'),
    idleInTransactionSessionTimeoutMillis: parseInt(
      process.env['DATABASE_POOL_IDLE_IN_TRANSACTION'] || '60000'
    ),
    allowExitOnIdle: process.env['DATABASE_POOL_ALLOW_EXIT_ON_IDLE'] !== 'false',
  };
}
