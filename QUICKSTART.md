# Quick Start Guide - @kitiumai/database

Get up and running with the database package in 5 minutes.

## Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 12+ (or use Docker)
- (Optional) MongoDB for multi-database support

## Option 1: Using Docker (Recommended for Development)

### 1. Start Services

```bash
docker-compose up -d
```

This starts:

- PostgreSQL on port 5432
- PgBouncer (connection pool) on port 6432
- MongoDB on port 27017
- pgAdmin on port 5050

### 2. Verify Services

```bash
docker-compose ps
```

You should see all 5 services running (healthy).

### 3. Configure Environment

```bash
cp .env.example .env
```

Update `.env` with Docker credentials:

```env
DATABASE_URL="postgresql://kitiumai:dev_password@localhost:6432/kitiumai_db?schema=public"
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_POOL_CONNECTION_TIMEOUT=5000
NODE_ENV=development
```

## Option 2: Local PostgreSQL Installation

### 1. Install PostgreSQL

**macOS:**

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu):**

```bash
sudo apt-get install postgresql-16
sudo systemctl start postgresql
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
psql -U postgres
CREATE DATABASE kitiumai_db;
CREATE USER kitiumai WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE kitiumai_db TO kitiumai;
\q
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Update `.env`:

```env
DATABASE_URL="postgresql://kitiumai:dev_password@localhost:5432/kitiumai_db?schema=public"
NODE_ENV=development
```

## Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Create and run migrations
npm run db:migrate:dev

# Seed initial data
npm run db:seed
```

## Verify Installation

```bash
# Check database health
npm run db:studio
```

This opens Prisma Studio where you can:

- View all data
- Create/edit records
- Run queries
- Explore schema

Or run:

```bash
# Test the database
node -e "
const { initializeDatabase, getDatabase } = require('./dist/index');
(async () => {
  await initializeDatabase();
  const db = getDatabase();
  const users = await db.user.findMany();
  console.log('Users:', users);
})();
"
```

## Common Tasks

### Create a New Migration

```bash
npm run migration:create
```

Prompts you to describe the change, then creates a migration file.

### View Database

```bash
npm run db:studio
```

Opens visual database browser.

### Reset Database

```bash
npm run db:reset
```

⚠️ This deletes all data and recreates the database!

### Run Tests

```bash
npm test
```

### Build Package

```bash
npm run build
```

Creates optimized TypeScript in `dist/` directory.

## Database Setup Using the Package

```typescript
import { initializeDatabase, getDatabase } from '@kitiumai/database';

async function main() {
  // Initialize connection pool
  await initializeDatabase({
    enableLogging: true, // Show SQL queries
  });

  const db = getDatabase();

  // Create a user
  const user = await db.user.create({
    data: {
      email: 'developer@example.com',
      name: 'Developer',
      password: 'hashed_password',
      role: 'USER',
    },
  });

  // Query users
  const users = await db.user.findMany({
    where: { isActive: true },
  });

  console.log('Created user:', user);
  console.log('Active users:', users);
}

main().catch(console.error);
```

## Database Models Available

### User

- Manage application users
- Role-based access control (ADMIN, USER, GUEST)
- Password storage

### Session

- Track user sessions
- Authentication tokens
- Auto-expiring tokens

### AuditLog

- Track all user actions
- Store what changed and when
- Metadata for compliance

### AppConfig

- Store application settings
- Feature flags
- Environment-specific config

## Connection Pooling

The package automatically sets up connection pooling:

- **Min connections**: 2 (keeps these always warm)
- **Max connections**: 10 (scales up to 10 under load)
- **Idle timeout**: 30 seconds (closes unused connections)
- **Connection timeout**: 5 seconds (fails fast if can't connect)

For high-traffic apps, use external PgBouncer (included in docker-compose).

## Next Steps

1. ✅ Database is initialized
2. 📚 Read [README.md](./README.md) for complete API documentation
3. 🔒 Update default seed passwords (in scripts/seed.ts)
4. 🧪 Add your application logic
5. 📝 Create migrations as you add features

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

```bash
# Check if PostgreSQL is running
docker-compose ps    # if using Docker
# or
psql -U postgres     # if using local installation
```

### Migrations Failed

```
Error: Cannot find module '@prisma/client'
```

**Solution:**

```bash
npm run db:generate
npm run db:migrate:dev
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5432
```

**Solution:**

```bash
# Change docker-compose port
sed -i 's/5432:5432/5433:5432/' docker-compose.yml
docker-compose up -d
```

### Wrong Database URL

**Solution:**
Check your `.env` file:

```bash
cat .env | grep DATABASE_URL
```

Must have format:

```
postgresql://user:password@host:port/database?schema=public
```

## Getting Help

- 📖 Full documentation: [README.md](./README.md)
- 🐛 Report issues: [GitHub Issues](https://github.com/kitiumai/database/issues)
- 💬 Prisma docs: [prisma.io](https://www.prisma.io)

## Performance Tips

1. **Use PgBouncer** for concurrent connections (docker-compose includes it)
2. **Index frequently queried fields** (schema already has essential indexes)
3. **Use `.select()` to limit fields** returned from queries
4. **Batch operations** with `.createMany()` instead of loops
5. **Enable query logging** only in development

## Security Reminders

⚠️ **Before going to production:**

1. ✅ Update all default passwords
2. ✅ Use bcrypt for password hashing
3. ✅ Set `NODE_ENV=production`
4. ✅ Configure SSL for database connections
5. ✅ Review audit logs regularly
6. ✅ Use environment variables for secrets
7. ✅ Enable database backups

```typescript
// Example: Secure password hashing
import bcrypt from 'bcrypt';

const password = 'user_password';
const hashedPassword = await bcrypt.hash(password, 10);

// Store hashedPassword in database
```

## Docker Useful Commands

```bash
# View logs
docker-compose logs -f postgres

# Connect to database
docker-compose exec postgres psql -U kitiumai -d kitiumai_db

# Access pgAdmin
# Open browser: http://localhost:5050
# Email: admin@kitiumai.local
# Password: admin

# Stop services
docker-compose down

# Clean up everything
docker-compose down -v
```

You're ready to go! 🚀
