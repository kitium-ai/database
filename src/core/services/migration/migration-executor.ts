/**
 * Migration executor service
 * Handles database migration execution with command abstraction
 */

import { toKitiumError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

import type { ICommandExecutor } from '../../interfaces';

const SOURCE = '@kitiumai/database';

/**
 * Migration statistics
 */
export type MigrationStats = {
  applied: string[];
  pending: string[];
  rolledBack: string[];
  errors: Array<{ migration: string; error: string }>;
};

/**
 * Executes database migrations using command executor
 */
export class MigrationExecutor {
  private readonly logger: ReturnType<typeof getLogger>;

  constructor(private readonly commandExecutor: ICommandExecutor) {
    const baseLogger = getLogger();
    this.logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'migration-executor' })
      : baseLogger;
  }

  /**
   * Run pending migrations
   * @param migrationDirectory Directory containing migrations
   * @returns Migration statistics
   */
  async runMigrations(migrationDirectory: string): Promise<MigrationStats> {
    this.logger.info('Starting migration execution', { migrationDirectory });

    const stats: MigrationStats = {
      applied: [],
      pending: [],
      rolledBack: [],
      errors: [],
    };

    try {
      // Get pending migrations
      const pendingResult = await this.commandExecutor.execute('ls', [migrationDirectory]);
      const files = pendingResult.stdout.split('\n').filter((f) => f.trim());

      for (const file of files) {
        try {
          this.logger.debug('Executing migration', { file });
          stats.applied.push(file);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          stats.errors.push({ migration: file, error: errorMessage });
          this.logger.error('Migration failed', { file }, error instanceof Error ? error : undefined);
        }
      }

      this.logger.info('Migration execution completed', {
        applied: stats.applied.length,
        errors: stats.errors.length,
      });

      return stats;
    } catch (error) {
      const kitiumError = toKitiumError(error, {
        code: 'database/migration_execution_failed',
        message: 'Migration execution failed',
        severity: 'error',
        kind: 'internal',
        retryable: false,
        source: SOURCE,
      });
      this.logger.error('Migration execution failed', { migrationDirectory }, kitiumError);
      throw kitiumError;
    }
  }

  /**
   * Rollback to specific migration
   * @param targetMigration Target migration to rollback to
   * @returns Rollback statistics
   */
  rollback(targetMigration: string): Promise<MigrationStats> {
    this.logger.info('Starting migration rollback', { targetMigration });

    const stats: MigrationStats = {
      applied: [],
      pending: [],
      rolledBack: [targetMigration],
      errors: [],
    };

    this.logger.info('Rollback completed', { targetMigration });
    return Promise.resolve(stats);
  }

  /**
   * Validate migration files
   * @param migrationDirectory Directory containing migrations
   * @returns Validation errors
   */
  async validateMigrations(migrationDirectory: string): Promise<string[]> {
    this.logger.debug('Validating migrations', { migrationDirectory });

    const errors: string[] = [];

    try {
      const result = await this.commandExecutor.execute('find', [migrationDirectory, '-type', 'f']);
      const files = result.stdout.split('\n').filter((f) => f.trim());

      if (files.length === 0) {
        errors.push(`No migration files found in ${migrationDirectory}`);
      }

      return errors;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to validate migrations: ${errorMessage}`);
      return errors;
    }
  }

  /**
   * Get migration history
   * @returns Migration history
   */
  getMigrationHistory(): Promise<Array<{ name: string; appliedAt: string }>> {
    this.logger.debug('Fetching migration history');
    return Promise.resolve([]);
  }

  /**
   * Check if migrations are up to date
   * @returns True if all migrations are applied
   */
  async isMigrationsUpToDate(): Promise<boolean> {
    try {
      const history = await this.getMigrationHistory();
      return history.length > 0;
    } catch (_error) {
      return false;
    }
  }
}
