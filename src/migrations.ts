/**
 * Database migration utilities and automation
 */

import { InternalError } from '@kitiumai/error';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getDatabase } from './client';
import type { MigrationResult } from './types';
import { logStructured } from './observability';

/**
 * Run pending migrations
 */
export async function migrationRunner(): Promise<MigrationResult[]> {
  const db = getDatabase();

  try {
    logStructured('info', 'Running database migrations...');

    const exec = promisify(execFile);
    const result = await exec('npx', ['prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma']);

    logStructured('info', 'Migration command completed', { stdout: result.stdout });

    const migrations = await db.$queryRaw<MigrationResult[]>`
      SELECT
        id,
        checksum,
        finished_at as "finishedAt",
        execution_time as "executionTime",
        success
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC
    `;

    return migrations as MigrationResult[];
  } catch (error) {
    logStructured('error', 'Migration error', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new InternalError({
      code: 'database/migration_failed',
      message: 'Migration execution failed',
      severity: 'error',
      retryable: false,
      cause: error,
    });
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

    return (pending as Array<{ count: number }>)[0]?.count === 0;
  } catch {
    logStructured('error', 'Failed to check migration status');
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
  } catch {
    logStructured('error', 'Failed to retrieve migration history');
    return [];
  }
}

/**
 * Rollback to a specific migration
 */
export async function rollbackToMigration(migrationId: string): Promise<boolean> {
  const exec = promisify(execFile);
  try {
    logStructured('warn', 'Rolling back migration', { migrationId });
    await exec('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', migrationId, '--schema', 'prisma/schema.prisma']);
    return true;
  } catch (error) {
    logStructured('error', 'Rollback failed', {
      migrationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new InternalError({
      code: 'database/rollback_failed',
      message: 'Failed to rollback migration',
      severity: 'error',
      retryable: false,
      cause: error,
    });
  }
}

/**
 * Validate database schema
 */
export async function validateSchema(): Promise<{ valid: boolean; errors: string[] }> {
  const db = getDatabase();
  const errors: string[] = [];

  try {
    logStructured('info', 'Validating database schema...');

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

    logStructured('info', 'Schema table count', { count: tables.length });

    // Check for migrations table
    const hasMigrationsTable = (tables as Array<Record<string, unknown>>).some(
      (t) => t['table_name'] === '_prisma_migrations'
    );

    if (!hasMigrationsTable) {
      errors.push('_prisma_migrations table not found. Run migrations first.');
      return { valid: false, errors };
    }

    logStructured('info', 'Schema validation completed');
    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(
      `Schema validation error: ${error instanceof Error ? error.message : String(error)}`
    );
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

    return (stats as Array<Record<string, unknown>>)[0] || {};
  } catch {
    logStructured('error', 'Failed to get database statistics');
    return {};
  }
}
