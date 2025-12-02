# @kitiumai/database

An enterprise-ready database package built with Prisma ORM, providing robust PostgreSQL and MongoDB support with advanced features like connection pooling, automated migrations, and seed data management.

## Features

- 🗄️ **Multi-Database Support**: PostgreSQL and MongoDB
- 🔌 **Connection Pooling**: PgBouncer-style configuration with automatic pool management
- 🔄 **Migration Management**: Automated schema migrations with full history tracking
- 🌱 **Data Seeding**: Built-in seed scripts for initial data setup
- 🔒 **Type Safety**: Full TypeScript support with generated types
- 📊 **Monitoring**: Database health checks and statistics
- 🔐 **Enterprise Ready**: Audit logging, user sessions, and configuration management
- 🛡️ **Security**: Prepared statements and SQL injection prevention

## Installation

```bash
npm install @kitiumai/database
# or
yarn add @kitiumai/database
```

## Quick Start

### 1. Environment Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure your database connection:

```env
# PostgreSQL Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/kitiumai_db?schema=public"
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_POOL_CONNECTION_TIMEOUT=5000

# Environment
NODE_ENV=development
```

### 2. Initialize Database

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate:dev

# Seed database with initial data
npm run db:seed
```

### 3. Use in Your Application

```typescript
import { initializeDatabase, getDatabase } from '@kitiumai/database';

// Initialize the database client
await initializeDatabase();

// Get the Prisma client instance
const db = getDatabase();

// Use Prisma normally
const users = await db.user.findMany();
const newUser = await db.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    password: 'hashed_password',
    role: 'USER',
  },
});
```

## API Reference

### Database Client

#### `initializeDatabase(config?: Partial<DatabaseConfig>): Promise<PrismaClient>`

Initializes the database client with connection pooling.

```typescript
import { initializeDatabase } from '@kitiumai/database';

const db = await initializeDatabase({
  databaseUrl: 'postgresql://...',
  enableLogging: true,
});
```

**Parameters:**

- `config` (optional): Database configuration object
  - `databaseUrl`: PostgreSQL connection string
  - `mongodbUrl`: MongoDB connection string (optional)
  - `pooling`: Connection pool configuration
  - `enableLogging`: Enable query logging

**Returns:** Prisma Client instance

#### `getDatabase(): PrismaClient`

Gets the initialized database client instance.

```typescript
import { getDatabase } from '@kitiumai/database';

const db = getDatabase();
const users = await db.user.findMany();
```

#### `disconnectDatabase(): Promise<void>`

Gracefully disconnect from the database.

```typescript
import { disconnectDatabase } from '@kitiumai/database';

await disconnectDatabase();
```

#### `healthCheck(): Promise<boolean>`

Check database connectivity.

```typescript
import { healthCheck } from '@kitiumai/database';

const isHealthy = await healthCheck();
```

#### `executeQuery<T>(query: string, params?: unknown[]): Promise<T[]>`

Execute raw SQL queries.

```typescript
import { executeQuery } from '@kitiumai/database';

const results = await executeQuery<User>('SELECT * FROM users WHERE role = $1', ['ADMIN']);
```

### Connection Pooling

#### `createConnectionPool(databaseUrl: string, config: PoolingConfig): string`

Creates a pooled database URL with optimized connection management.

```typescript
import { createConnectionPool } from '@kitiumai/database';

const pooledUrl = createConnectionPool(databaseUrl, {
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

**Configuration:**

- `min`: Minimum number of connections in the pool
- `max`: Maximum number of connections in the pool
- `idleTimeoutMillis`: Close idle connections after this time
- `connectionTimeoutMillis`: Timeout for acquiring a connection

#### `generatePgBouncerConfig(databaseUrl: string, config: PoolingConfig, pgBouncerPort?: number): string`

Generate PgBouncer configuration file for external pooling proxy.

```typescript
import { generatePgBouncerConfig } from '@kitiumai/database';

const pgBouncerConfig = generatePgBouncerConfig(databaseUrl, poolingConfig);
// Save to pgbouncer.ini and deploy
```

### Migrations

#### `migrationRunner(): Promise<MigrationResult[]>`

Run pending migrations.

```typescript
import { migrationRunner } from '@kitiumai/database';

const results = await migrationRunner();
```

#### `isMigrationsUpToDate(): Promise<boolean>`

Check if all migrations are applied.

```typescript
import { isMigrationsUpToDate } from '@kitiumai/database';

const isUpToDate = await isMigrationsUpToDate();
```

#### `getMigrationHistory(): Promise<MigrationResult[]>`

Get complete migration history.

```typescript
import { getMigrationHistory } from '@kitiumai/database';

const history = await getMigrationHistory();
history.forEach((migration) => {
  console.log(`${migration.id}: ${migration.success ? 'Success' : 'Failed'}`);
});
```

#### `validateSchema(): Promise<{ valid: boolean; errors: string[] }>`

Validate database schema integrity.

```typescript
import { validateSchema } from '@kitiumai/database';

const { valid, errors } = await validateSchema();
if (!valid) {
  console.error('Schema validation failed:', errors);
}
```

#### `getDatabaseStats(): Promise<Record<string, unknown>>`

Get database statistics and size information.

```typescript
import { getDatabaseStats } from '@kitiumai/database';

const stats = await getDatabaseStats();
console.log(`Database size: ${stats.size}`);
console.log(`Connection count: ${stats.connections}`);
```

### Seeding

#### `seedDatabase(): Promise<SeedResult>`

Seed the database with initial data.

```typescript
import { seedDatabase } from '@kitiumai/database';

const result = await seedDatabase();
console.log(`Created: ${result.recordsCreated}, Updated: ${result.recordsUpdated}`);
```

#### `clearDatabase(): Promise<SeedResult>`

Clear all data from the database (use with caution!).

```typescript
import { clearDatabase } from '@kitiumai/database';

await clearDatabase();
```

## CLI Commands

### Database Migrations

```bash
# Create a new migration
npm run migration:create

# Apply migrations
npm run db:migrate:deploy

# Create and apply migration in development
npm run db:migrate:dev

# Reset database (drop, recreate, migrate, seed)
npm run db:reset

# Push schema changes directly (development only)
npm run db:push
```

### Database Seeding

```bash
# Seed with initial data
npm run db:seed
```

### Utilities

```bash
# Open Prisma Studio (visual database explorer)
npm run db:studio

# Generate Prisma Client
npm run db:generate

# Validate Prisma schema
npm run db:validate
```

## Data Models

### User

Manages application users with role-based access control.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Roles:**

- `ADMIN`: Full system access
- `USER`: Standard user access
- `GUEST`: Limited read-only access

### Session

Tracks user sessions and authentication tokens.

```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### AuditLog

Comprehensive audit trail for compliance and debugging.

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  resource  String
  changes   Json?
  metadata  Json?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### AppConfig

Application configuration and feature flags.

```prisma
model AppConfig {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  category  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Connection Pooling Configuration

### Environment Variables

Configure connection pooling via environment variables:

```env
# Pool size
DATABASE_POOL_MIN=2              # Minimum connections
DATABASE_POOL_MAX=10             # Maximum connections
DATABASE_POOL_MAX_USES=7500      # Max queries per connection
DATABASE_POOL_REAP_INTERVAL=1000 # Pool cleanup interval (ms)

# Timeouts
DATABASE_POOL_IDLE_TIMEOUT=30000                    # Close idle after 30s
DATABASE_POOL_CONNECTION_TIMEOUT=5000               # Acquire timeout 5s
DATABASE_POOL_IDLE_IN_TRANSACTION=60000            # Idle in transaction timeout
```

### PgBouncer Configuration

For high-traffic applications, use external PgBouncer proxy:

```bash
# Generate PgBouncer configuration
npm run generate:pgbouncer > pgbouncer.ini

# Deploy and start PgBouncer
pgbouncer -d pgbouncer.ini
```

**Update your DATABASE_URL to use PgBouncer:**

```env
DATABASE_URL="postgresql://user:password@localhost:6432/kitiumai_db?schema=public"
```

## Security Considerations

### Password Management

The seed script includes placeholder passwords. In production:

1. Use bcrypt or similar for password hashing:

```bash
npm install bcrypt
```

2. Update the seed script to hash passwords:

```typescript
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash('password', 10);
```

### Environment Variables

Never commit `.env` files to version control:

```bash
# Already in .gitignore
.env
.env.local
.env.*.local
```

### Prepared Statements

Always use Prisma's built-in protection against SQL injection:

```typescript
// ✓ Safe - uses prepared statements
const user = await db.user.findUnique({
  where: { email: userInput },
});

// ✗ Avoid - raw queries with string interpolation
const result = await db.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = '${userInput}'` // DON'T DO THIS!
);

// ✓ Safe - raw queries with parameters
const result = await db.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

### Audit Logging

Implement audit logging for sensitive operations:

```typescript
import { getDatabase } from '@kitiumai/database';

const db = getDatabase();

// Log user actions
await db.auditLog.create({
  data: {
    userId: user.id,
    action: 'USER_CREATED',
    resource: 'user',
    changes: { email: newUser.email, role: newUser.role },
    metadata: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
  },
});
```

## Performance Optimization

### Connection Pooling

Use connection pooling to handle concurrent requests efficiently:

```typescript
import { initializeDatabase } from '@kitiumai/database';

await initializeDatabase({
  pooling: {
    min: 5, // Maintain 5 warm connections
    max: 20, // Allow up to 20 connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
});
```

### Database Indexing

The schema includes indexes on frequently queried fields:

```prisma
model User {
  // ...
  @@index([email])    // Fast email lookups
  @@index([role])     // Fast role filtering
}

model AuditLog {
  // ...
  @@index([userId])   // Fast user-specific queries
  @@index([createdAt]) // Fast time-range queries
}
```

### Query Optimization

Use Prisma's query optimization features:

```typescript
// Include related data efficiently
const users = await db.user.findMany({
  include: {
    sessions: true,
    auditLogs: true,
  },
});

// Select specific fields
const emails = await db.user.findMany({
  select: { email: true },
});

// Batch operations
const users = await db.user.createMany({
  data: [
    { email: 'user1@example.com', ... },
    { email: 'user2@example.com', ... },
  ],
});
```

## Troubleshooting

### Connection Timeout

**Error:** `Client.connect() timeout expired`

**Solution:** Increase connection timeout:

```env
DATABASE_POOL_CONNECTION_TIMEOUT=10000
```

### Too Many Connections

**Error:** `remaining connection slots reserved for non-replication superuser connections`

**Solution:** Reduce pool size or enable PgBouncer:

```env
DATABASE_POOL_MAX=5
```

### Schema Out of Sync

**Error:** `The database schema is not in sync with the Prisma schema`

**Solution:** Run migrations:

```bash
npm run db:migrate:dev
```

### Prisma Client Not Generated

**Error:** `Could not find the @prisma/client module`

**Solution:** Generate the Prisma Client:

```bash
npm run db:generate
```

## Development

### Build TypeScript

```bash
npm run build
npm run dev      # Watch mode
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
npm run test:watch
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Support

For issues and questions, visit [GitHub Issues](https://github.com/kitiumai/database/issues)

## Changelog

### v1.0.0 (Initial Release)

- ✨ Prisma ORM integration
- 🔌 Connection pooling with PgBouncer support
- 🔄 Automated migrations
- 🌱 Database seeding
- 📊 Monitoring and health checks
- 🔒 Audit logging
- 🛡️ Security best practices
