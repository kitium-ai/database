# @kitiumai/database

Enterprise-ready database package built on Prisma with hardened defaults, resiliency, and observability for PostgreSQL and MongoDB.

## What is this package?

`@kitiumai/database` is a comprehensive, production-grade database abstraction layer designed for modern SaaS applications. It provides a unified interface for PostgreSQL and MongoDB databases with enterprise features like connection pooling, automatic migrations, observability, and resilience patterns.

The package combines the power of Prisma ORM with additional enterprise capabilities including:
- Multi-database support with API parity
- Production-ready connection pooling
- Automated schema migrations and rollback
- Comprehensive observability and monitoring
- Built-in security features and guardrails
- Type-safe database operations with full TypeScript support

## Why do we need this package?

In modern SaaS development, database operations are critical for application reliability, performance, and maintainability. Raw database connections and basic ORMs often lack the enterprise features needed for production applications:

- **Connection Management**: Proper pooling prevents connection exhaustion
- **Resilience**: Retry logic and circuit breakers handle transient failures
- **Observability**: Metrics and logging enable performance monitoring
- **Security**: Prepared statements and audit trails protect against vulnerabilities
- **Migrations**: Automated schema changes with rollback capabilities
- **Multi-Database**: Unified APIs across different database engines

This package addresses these needs by providing battle-tested patterns used by big tech companies, wrapped in a developer-friendly API.

## Competitor Comparison

| Feature | @kitiumai/database | Prisma Client | TypeORM | Drizzle | MikroORM |
|---------|-------------------|---------------|---------|---------|----------|
| **Multi-Database** | ✅ PostgreSQL + MongoDB | ❌ Single DB | ✅ Multiple | ❌ Single DB | ✅ Multiple |
| **Connection Pooling** | ✅ PgBouncer-style | ❌ Manual | ✅ Basic | ❌ Manual | ✅ Basic |
| **Observability** | ✅ Built-in metrics | ❌ External | ❌ External | ❌ External | ❌ External |
| **Migration Rollback** | ✅ Automated | ❌ Manual | ✅ Basic | ❌ Manual | ✅ Basic |
| **Health Checks** | ✅ Readiness/Liveness | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual |
| **Circuit Breaker** | ✅ Built-in | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual |
| **Type Safety** | ✅ Full TypeScript | ✅ Generated | ✅ Decorators | ✅ SQL-first | ✅ Identity Map |
| **Enterprise Ready** | ✅ Production hardened | ⚠️ Requires setup | ⚠️ Requires setup | ⚠️ Requires setup | ⚠️ Requires setup |

## Unique Selling Proposition (USP)

**"Enterprise Database Operations Made Simple"**

What sets `@kitiumai/database` apart:

1. **Big Tech Standards**: Implements patterns used by Google, Amazon, and Microsoft database services
2. **Zero-Config Production**: Sensible defaults that work in production without extensive tuning
3. **Unified Multi-Database**: Single API for both SQL and NoSQL databases
4. **Built-in Resilience**: Circuit breakers, retry logic, and graceful degradation
5. **Comprehensive Observability**: Metrics, tracing, and health checks out of the box
6. **Security First**: Prepared statements, audit trails, and destructive operation guards
7. **Developer Experience**: Type-safe, auto-generated APIs with excellent IDE support

## Installation

```bash
npm install @kitiumai/database
# or
yarn add @kitiumai/database
```

## Quick Start

```bash
# Copy environment file
cp .env.example .env

# Install deps and generate Prisma client
npm install
npm run db:generate

# Run migrations and seed
npm run db:migrate:deploy
npm run db:seed
```

Use the client in your application:

```typescript
import { initializeDatabase, getDatabase, readinessCheck } from '@kitiumai/database';

await initializeDatabase({
  retry: { maxRetries: 5, retryDelay: 200 },
  observability: { enableMetrics: true },
});

const ready = await readinessCheck();
if (ready.status !== 'ready') throw new Error('Database not ready');

const db = getDatabase();
const users = await db.user.findMany();
```

## Configuration

`loadDatabaseConfig` normalizes environment variables and merges overrides. Key variables:

- `DATABASE_URL` – PostgreSQL connection string
- `DATABASE_POOL_MIN` / `DATABASE_POOL_MAX` / `DATABASE_POOL_IDLE_TIMEOUT` / `DATABASE_POOL_CONNECTION_TIMEOUT` – pooling
- `DATABASE_MAX_RETRIES` / `DATABASE_RETRY_DELAY` – retry/backoff for startup
- `DATABASE_ENABLE_LOGGING` / `DATABASE_LOG_LEVEL` – structured log controls
- `DATABASE_ENABLE_METRICS` / `DATABASE_ENABLE_TRACING` – observability toggles
- `DATABASE_SHUTDOWN_TIMEOUT` – graceful shutdown wait (ms)
- `DEFAULT_ADMIN_PASSWORD` – seed default password (hashed automatically)
- `ALLOW_CLEAR_DATABASE` – set to `true` to enable destructive `clearDatabase`
- `MONGODB_URL` / `MONGODB_DB` / `MONGODB_POOL_SIZE` – MongoDB connectivity

Call `validateDatabaseConfig` to enforce required values in CI/CD.

## API Reference

### Core Database Operations

#### Initialization and Health
- `initializeDatabase(config?: Partial<DatabaseConfig>): Promise<PrismaClient>` – Initialize PostgreSQL database with pooling, retry/backoff, structured logging, and graceful shutdown hooks
- `initializeMongoDatabase(config?: Partial<DatabaseConfig>): Promise<MongoClient>` – Initialize MongoDB connection with pooling and readiness checks
- `getDatabase(): PrismaClient` – Get the initialized Prisma client instance
- `getMongoDatabase(): MongoClient` – Get the initialized MongoDB client instance
- `disconnectDatabase(options?: { wait?: boolean; timeoutMs?: number }): Promise<void>` – Graceful shutdown with configurable timeout
- `disconnectMongoDatabase(): Promise<void>` – Disconnect MongoDB client
- `healthCheck(): Promise<boolean>` – Liveness probe for database connectivity
- `readinessCheck(): Promise<HealthReport>` – Readiness probe with detailed diagnostics
- `mongoHealthCheck(): Promise<boolean>` – Health check for MongoDB connectivity

#### Configuration
- `loadDatabaseConfig(overrides?: Partial<DatabaseConfig>): DatabaseConfig` – Load and normalize database configuration from environment
- `validateDatabaseConfig(config: DatabaseConfig): void` – Validate required configuration values

#### Data Access
- `executeQuery<T>(query: Prisma.Sql, operation?: string): Promise<T[]>` – Execute parameterized raw SQL queries with metrics and tracing
- `executeUnsafeQuery<T>(query: string, params?: unknown[]): Promise<T[]>` – Execute raw SQL queries (escape hatch for legacy code)

### Connection Pooling

- `createConnectionPool(databaseUrl: string, config: PoolingConfig): string` – Create pooled database connection URL
- `getPoolingConfigFromEnvironment(): PoolingConfig` – Load pooling configuration from environment variables
- `generatePgBouncerConfig(databaseUrl: string, config: PoolingConfig, pgBouncerPort?: number): string` – Generate PgBouncer configuration file

### Migrations

- `migrationRunner(): Promise<MigrationResult[]>` – Execute pending migrations and return results
- `rollbackToMigration(migrationId: string): Promise<boolean>` – Rollback to specific migration
- `getMigrationHistory(): Promise<MigrationResult[]>` – Get migration execution history
- `isMigrationsUpToDate(): Promise<boolean>` – Check if all migrations are applied
- `validateSchema(): Promise<boolean>` – Validate schema against migrations

### Seeding and Data Management

- `seedDatabase(config?: Partial<DatabaseConfig>): Promise<SeedResult>` – Execute database seeding with hashed passwords and idempotent operations
- `clearDatabase(config?: Partial<DatabaseConfig>): Promise<SeedResult>` – Clear all data (requires `ALLOW_CLEAR_DATABASE=true`)

### Observability

- `databaseMetrics(): Record<string, unknown>` – Get in-memory query metrics snapshot
- `configureObservability(options?: ObservabilityOptions): void` – Configure observability settings
- `getMetricsSnapshot(): MetricsSnapshot` – Get detailed metrics snapshot
- `logStructured(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void` – Structured logging

### Advanced Architecture (New)

#### Dependency Injection
- `registerBindings(): void` – Register all service bindings in DI container
- `registerTestBindings(): void` – Register test-specific bindings
- `DIContainer` – Dependency injection container instance

#### Core Services
- `RetryCoordinator` – Manages retry logic and backoff strategies
- `HealthCheckOrchestrator` – Orchestrates health checks across databases
- `MigrationExecutor` – Executes database migrations with statistics
- `DatabaseCleaner` – Safely clears database with statistics
- `SeedOrchestrator` – Orchestrates seeding operations

#### Database Adapters
- `PostgresAdapter` – PostgreSQL database adapter implementation
- `MongoAdapter` – MongoDB database adapter implementation
- `PostgresHealthCheck` – PostgreSQL-specific health checks
- `MongoHealthCheck` – MongoDB-specific health checks

#### Infrastructure
- `PrismaClientFactory` – Factory for creating Prisma clients
- `MongoClientFactory` – Factory for creating MongoDB clients
- `ConfigurationLoader` – Loads configuration from various sources
- `ConfigurationValidator` – Validates configuration schemas
- `MetricsCollector` – Collects and aggregates metrics
- `QueryLogger` – Logs database queries with context

#### Retry Strategies
- `ExponentialBackoffStrategy` – Exponential backoff retry strategy
- `ExponentialBackoffWithJitterStrategy` – Exponential backoff with jitter
- `LinearBackoffStrategy` – Linear backoff retry strategy

### TypeScript Types

#### Configuration Types
- `DatabaseConfig` – Main database configuration interface
- `PoolingConfig` – Connection pooling configuration
- `RetryConfig` – Retry and backoff configuration
- `ObservabilityOptions` – Observability and monitoring options
- `ShutdownConfig` – Graceful shutdown configuration
- `MongoConfig` – MongoDB-specific configuration

#### Result Types
- `MigrationResult` – Migration execution result
- `SeedResult` – Seeding operation result
- `HealthReport` – Health check report
- `MetricsSnapshot` – Metrics data snapshot
- `MigrationStats` – Migration execution statistics
- `SeedingStats` – Seeding operation statistics
- `ClearingStats` – Database clearing statistics

#### Interface Types
- `IDatabaseAdapter` – Database adapter interface
- `IRetryStrategy` – Retry strategy interface
- `IConfigProvider` – Configuration provider interface
- `IHealthCheckProvider` – Health check provider interface
- `ICommandExecutor` – Command execution interface

#### Metric Types
- `ConnectionMetric` – Connection pool metrics
- `QueryMetric` – Query execution metrics
- `QueryContext` – Query execution context

## Examples

### Basic Usage

```typescript
import { initializeDatabase, getDatabase, readinessCheck } from '@kitiumai/database';

// Initialize with default configuration
await initializeDatabase();

// Check readiness
const health = await readinessCheck();
if (health.status !== 'ready') {
  throw new Error('Database not ready');
}

// Use the database
const db = getDatabase();
const users = await db.user.findMany();
```

### Advanced Configuration

```typescript
import { initializeDatabase, loadDatabaseConfig } from '@kitiumai/database';

const config = loadDatabaseConfig({
  pooling: {
    min: 5,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  retry: {
    maxRetries: 5,
    retryDelay: 1000,
  },
  observability: {
    enableMetrics: true,
    enableTracing: true,
    logLevel: 'info',
  },
});

await initializeDatabase(config);
```

### Safe Query Execution

```typescript
import { executeQuery } from '@kitiumai/database';
import { Prisma } from '@prisma/client';

// Parameterized query (recommended)
const admins = await executeQuery<{ id: string; email: string }>(
  Prisma.sql`SELECT id, email FROM "User" WHERE role = ${'ADMIN'}`,
  'get-admins'
);

// Complex query with multiple parameters
const users = await executeQuery<{ id: string; name: string }>(
  Prisma.sql`
    SELECT id, name FROM "User"
    WHERE created_at > ${new Date('2024-01-01')}
    AND active = ${true}
    ORDER BY name
    LIMIT ${10}
  `,
  'get-recent-active-users'
);
```

### Migration Management

```typescript
import { migrationRunner, rollbackToMigration, getMigrationHistory } from '@kitiumai/database';

// Run pending migrations
const results = await migrationRunner();
console.log(`Applied ${results.length} migrations`);

// Get migration history
const history = await getMigrationHistory();
console.log('Migration history:', history);

// Rollback to specific migration
const success = await rollbackToMigration('20241201000000_initial_schema');
if (success) {
  console.log('Rollback completed');
}
```

### Health Checks and Monitoring

```typescript
import { healthCheck, readinessCheck, databaseMetrics } from '@kitiumai/database';

// Simple health check
const isHealthy = await healthCheck();
console.log('Database healthy:', isHealthy);

// Detailed readiness check
const report = await readinessCheck();
console.log('Readiness report:', report);

// Get metrics
const metrics = databaseMetrics();
console.log('Query metrics:', metrics);
```

### Multi-Database Setup

```typescript
import {
  initializeDatabase,
  initializeMongoDatabase,
  getDatabase,
  getMongoDatabase
} from '@kitiumai/database';

// Initialize both databases
await initializeDatabase({
  databaseUrl: process.env.DATABASE_URL,
});

await initializeMongoDatabase({
  mongo: {
    mongodbUrl: process.env.MONGODB_URL,
    dbName: 'myapp',
  },
});

// Use both databases
const postgresDb = getDatabase();
const mongoDb = getMongoDatabase();

// PostgreSQL operations
const users = await postgresDb.user.findMany();

// MongoDB operations
const documents = await mongoDb.collection('logs').find({}).toArray();
```

### Seeding with Security

```typescript
import { seedDatabase, clearDatabase } from '@kitiumai/database';

// Seed database (passwords automatically hashed)
const seedResult = await seedDatabase({
  defaultAdminPassword: 'secure-admin-password',
});

console.log('Seeding result:', seedResult);

// Clear database (requires ALLOW_CLEAR_DATABASE=true)
if (process.env.ALLOW_CLEAR_DATABASE === 'true') {
  const clearResult = await clearDatabase();
  console.log('Clear result:', clearResult);
}
```

### Custom Observability

```typescript
import { configureObservability, logStructured } from '@kitiumai/database';

// Configure observability
configureObservability({
  enableMetrics: true,
  enableTracing: true,
  loggerName: 'my-app-database',
  logLevel: 'debug',
});

// Structured logging
logStructured('info', 'Database operation started', {
  operation: 'user-creation',
  userId: '12345',
  timestamp: new Date().toISOString(),
});

logStructured('error', 'Database query failed', {
  operation: 'user-lookup',
  error: 'Connection timeout',
  duration: 5000,
});
```

### Using Dependency Injection

```typescript
import { DIContainer, registerBindings } from '@kitiumai/database';

// Register all bindings
registerBindings();

// Get services from container
const retryCoordinator = DIContainer.get('RetryCoordinator');
const healthOrchestrator = DIContainer.get('HealthCheckOrchestrator');

// Use services
await retryCoordinator.executeWithRetry(async () => {
  // Database operation
});

const healthReport = await healthOrchestrator.checkAll();
```

## CLI Commands

```bash
npm run migration:create       # Create a new migration
npm run db:migrate:deploy      # Apply migrations
npm run db:migrate:dev         # Create/apply migrations in development
npm run db:reset               # Drop, recreate, migrate, seed
npm run db:seed                # Seed with initial data
npm run db:studio              # Open Prisma Studio
npm run db:generate            # Generate Prisma client
npm run db:validate            # Validate Prisma schema
```

## Security Notes

- Prepared statements by default; unsafe helper provided for legacy flows only.
- Seed passwords are hashed with bcrypt; override via `DEFAULT_ADMIN_PASSWORD` or `passwordHasher` config.
- Destructive operations require explicit opt-in (`ALLOW_CLEAR_DATABASE=true`).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for unreleased and historical updates.
