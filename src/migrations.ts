/**
 * Database migration utilities and automation
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { toKitiumError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

import { getDatabase } from './client';
import type { MigrationResult } from './types';

const baseLogger = getLogger();
const logger: ReturnType<typeof getLogger> =
  'child' in baseLogger && typeof baseLogger.child === 'function'
    ? (baseLogger as IAdvancedLogger).child({ component: 'database-migrations' })
    : baseLogger;

const SOURCE = '@kitiumai/database';

/**
 * Run pending migrations
 */
export async function migrationRunner(): Promise<MigrationResult[]> {
  const db = getDatabase();

  try {
    logger.info('Running database migrations...');

    const exec = promisify(execFile);
    const result = await exec('npx', [
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ]);

    logger.info('Migration command completed', { stdout: result.stdout });

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
    const kitiumError = toKitiumError(error, {
      code: 'database/migration_failed',
      message: 'Migration execution failed',
      severity: 'error',
      kind: 'internal',
      retryable: false,
      source: SOURCE,
    });
    logger.error('Migration error', undefined, kitiumError);
    throw kitiumError;
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
  } catch (error) {
    logger.error(
      'Failed to check migration status',
      undefined,
      error instanceof Error ? error : undefined
    );
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

    return (migrations ?? []) as MigrationResult[];
  } catch (error) {
    logger.error(
      'Failed to retrieve migration history',
      undefined,
      error instanceof Error ? error : undefined
    );
    return [];
  }
}

/**
 * Rollback to a specific migration
 */
export async function rollbackToMigration(migrationId: string): Promise<boolean> {
  const exec = promisify(execFile);
  try {
    logger.warn('Rolling back migration', { migrationId });
    await exec('npx', [
      'prisma',
      'migrate',
      'resolve',
      '--rolled-back',
      migrationId,
      '--schema',
      'prisma/schema.prisma',
    ]);
    return true;
  } catch (error) {
    const kitiumError = toKitiumError(error, {
      code: 'database/rollback_failed',
      message: 'Failed to rollback migration',
      severity: 'error',
      kind: 'internal',
      retryable: false,
      source: SOURCE,
    });
    logger.error('Rollback failed', { migrationId }, kitiumError);
    throw kitiumError;
  }
}

/**
 * Validate database schema
 */
export async function validateSchema(): Promise<{ valid: boolean; errors: string[] }> {
  const db = getDatabase();
  const errors: string[] = [];

  try {
    logger.info('Validating database schema...');

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

    logger.info('Schema table count', { count: tables.length });

    // Check for migrations table
    const hasMigrationsTable = (tables as Array<Record<string, unknown>>).some(
      (t) => t['table_name'] === '_prisma_migrations'
    );

    if (!hasMigrationsTable) {
      errors.push('_prisma_migrations table not found. Run migrations first.');
      return { valid: false, errors };
    }

    logger.info('Schema validation completed');
    return { valid: errors.length === 0, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      'Schema validation error',
      undefined,
      error instanceof Error ? error : undefined
    );
    errors.push(`Schema validation error: ${errorMessage}`);
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

    return (stats as Array<Record<string, unknown>>)[0] ?? {};
  } catch (error) {
    logger.error(
      'Failed to get database statistics',
      undefined,
      error instanceof Error ? error : undefined
    );
    return {};
  }
}
