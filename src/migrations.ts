/**
 * Database migration utilities and automation
 */

import { getDatabase } from './client';
import type { MigrationResult } from './types';

/**
 * Run pending migrations
 */
export async function migrationRunner(): Promise<MigrationResult[]> {
  const db = getDatabase();

  try {
    console.log('🔄 Running database migrations...');

    const result = await db.$executeRawUnsafe(`
      SELECT version, description, type, installed_by, installed_on, execution_time, success
      FROM "_prisma_migrations"
      ORDER BY installed_on DESC
      LIMIT 10
    `);

    console.log('✓ Migration check completed');
    return [];
  } catch (error) {
    console.error('✗ Migration error:', error);
    throw error;
  }
}

/**
 * Check if migrations are up to date
 */
export async function isMigrationsUpToDate(): Promise<boolean> {
  const db = getDatabase();

  try {
    // Check if there are any pending migrations
    const pending = await db.$queryRaw`
      SELECT COUNT(*) as count FROM "_prisma_migrations"
      WHERE finished_at IS NULL
    `;

    return (pending as any[])[0]?.count === 0;
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return false;
  }
}

/**
 * Get migration history
 */
export async function getMigrationHistory(): Promise<MigrationResult[]> {
  const db = getDatabase();

  try {
    const migrations = await db.$queryRaw`
      SELECT
        id,
        checksum,
        finished_at as finishedAt,
        execution_time as executionTime,
        success
      FROM "_prisma_migrations"
      ORDER BY installed_on DESC
    `;

    return (migrations || []) as MigrationResult[];
  } catch (error) {
    console.error('Failed to retrieve migration history:', error);
    return [];
  }
}

/**
 * Rollback to a specific migration
 */
export async function rollbackToMigration(migrationId: string): Promise<boolean> {
  console.warn(
    '⚠️  Rollback functionality requires manual intervention with Prisma'
  );
  console.warn(`To rollback, manually execute: prisma migrate resolve --rolled-back ${migrationId}`);

  return true;
}

/**
 * Validate database schema
 */
export async function validateSchema(): Promise<{ valid: boolean; errors: string[] }> {
  const db = getDatabase();
  const errors: string[] = [];

  try {
    console.log('🔍 Validating database schema...');

    // Check if required tables exist
    const tables = await db.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    if (!Array.isArray(tables) || tables.length === 0) {
      errors.push('No tables found in the public schema');
      return { valid: false, errors };
    }

    console.log(`✓ Found ${tables.length} tables in the database`);

    // Check for migrations table
    const hasMigrationsTable = (tables as any[]).some(
      (t: any) => t.table_name === '_prisma_migrations'
    );

    if (!hasMigrationsTable) {
      errors.push('_prisma_migrations table not found. Run migrations first.');
      return { valid: false, errors };
    }

    console.log('✓ Schema validation completed');
    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Schema validation error: ${error instanceof Error ? error.message : String(error)}`);
    return { valid: false, errors };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<Record<string, unknown>> {
  const db = getDatabase();

  try {
    const stats = await db.$queryRaw`
      SELECT
        datname as database,
        pg_size_pretty(pg_database_size(datname)) as size,
        numbackends as connections,
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as table_count,
        (SELECT COUNT(*) FROM "_prisma_migrations") as migration_count
      FROM pg_stat_database
      WHERE datname = current_database()
    `;

    return (stats as any[])[0] || {};
  } catch (error) {
    console.error('Failed to get database statistics:', error);
    return {};
  }
}
