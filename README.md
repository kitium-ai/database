# @kitiumai/database

Enterprise-ready database package built on Prisma with hardened defaults, resiliency, and observability for PostgreSQL and MongoDB.

## Features

- 🗄️ **Multi-Database Support**: PostgreSQL and MongoDB with parity APIs
- 🔌 **Connection Pooling**: PgBouncer-style configuration with automatic pool management
- 🔄 **Migration Management**: Automated schema migrations with rollback automation and drift checks
- 🌱 **Data Seeding**: Configurable, hashed, and idempotent seed routines with guardrails
- 🔒 **Type Safety**: Full TypeScript support with generated types
- 📊 **Observability**: Structured logging, query metrics, readiness, and health probes
- 🧠 **Resiliency**: Retry/backoff for connection bootstrap and graceful shutdown helpers
- 🛡️ **Security**: Prepared statements, optional unsafe escape hatch, and destructive-operation confirmations

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

### Initialization and Health
- `loadDatabaseConfig(overrides?: Partial<DatabaseConfig>): DatabaseConfig`
- `initializeDatabase(config?: Partial<DatabaseConfig>): Promise<PrismaClient>` – PgBouncer-style pooling, retry/backoff, structured logging, graceful shutdown hooks.
- `initializeMongoDatabase(config?: Partial<DatabaseConfig>): Promise<MongoClient>` – Pooled MongoDB connection with readiness checks.
- `getDatabase(): PrismaClient`
- `healthCheck(): Promise<boolean>` – Liveness probe.
- `readinessCheck(): Promise<HealthReport>` – Readiness probe with diagnostics.
- `databaseMetrics(): Record<string, unknown>` – In-memory query metrics snapshot.
- `disconnectDatabase(options?: { wait?: boolean; timeoutMs?: number }): Promise<void>` – Graceful shutdown.

### Safe Data Access
- `executeQuery<T>(query: Prisma.Sql, operation?: string): Promise<T[]>` – Parameterized raw SQL with metrics/tracing hooks.
- `executeUnsafeQuery<T>(query: string, params?: unknown[]): Promise<T[]>` – Escape hatch for legacy raw strings.

Example safe query:
```typescript
import { executeQuery } from '@kitiumai/database';
import { Prisma } from '@prisma/client';

const admins = await executeQuery<{ id: string }>(Prisma.sql`
  SELECT id FROM "User" WHERE role = ${'ADMIN'}
`);
```

### Connection Pooling
- `createConnectionPool(databaseUrl: string, config: PoolingConfig): string`
- `getPoolingConfigFromEnv(): PoolingConfig`
- `generatePgBouncerConfig(databaseUrl: string, config: PoolingConfig, pgBouncerPort?: number): string`

### Migrations
- `migrationRunner(): Promise<MigrationResult[]>` – Runs `prisma migrate deploy` and returns applied migrations.
- `rollbackToMigration(migrationId: string): Promise<boolean>` – Wraps `prisma migrate resolve --rolled-back`.
- `getMigrationHistory()` / `isMigrationsUpToDate()` / `validateSchema()` – Drift and metadata helpers.

### Seeding and Guardrails
- `seedDatabase(config?: Partial<DatabaseConfig>): Promise<SeedResult>` – Hashed, idempotent seeds (configurable hasher and defaults).
- `clearDatabase(config?: Partial<DatabaseConfig>): Promise<SeedResult>` – Protected destructive helper (requires `ALLOW_CLEAR_DATABASE=true`).

### MongoDB Utilities
- `getMongoDatabase()` / `disconnectMongoDatabase()` / `mongoHealthCheck()` – MongoDB lifecycle and probes with pooled client.

## Observability and Resiliency
- Structured JSON logs via `logStructured` with configurable logger name and level.
- Query metrics (`totalQueries`, `failures`, `averageDurationMs`, `p95DurationMs`) via `databaseMetrics`.
- Retry/backoff for client bootstrap and raw queries with circuit-breaker friendly hooks.
- Graceful shutdown waits for disconnection and honors configurable timeouts.

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
