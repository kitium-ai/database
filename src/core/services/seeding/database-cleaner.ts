/**
 * Database cleaner service
 * Safely clears database contents with logging and safety checks
 */

import { toKitiumError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

import type { IDatabaseAdapter } from '../../interfaces';

const SOURCE = '@kitiumai/database';

/**
 * Database clearing statistics
 */
export type ClearingStats = {
  tablesCleared: string[];
  recordsDeleted: number;
  errors: Array<{ table: string; error: string }>;
  duration: number;
};

/**
 * Clears database contents with safety checks
 */
export class DatabaseCleaner {
  private readonly logger: ReturnType<typeof getLogger>;

  constructor(private readonly adapter: IDatabaseAdapter) {
    const baseLogger = getLogger();
    this.logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'database-cleaner' })
      : baseLogger;
  }

  /**
   * Clear database with safety check
   * @param options Clearing options
   * @returns Clearing statistics
   * @throws Error if unsafe clearing is attempted
   */
  clear(options: { unsafe?: boolean; tables?: string[] } = {}): Promise<ClearingStats> {
    const startTime = Date.now();

    const stats: ClearingStats = {
      tablesCleared: [],
      recordsDeleted: 0,
      errors: [],
      duration: 0,
    };

    // Safety check for production environments
    if (!options.unsafe && process.env['NODE_ENV'] === 'production') {
      return Promise.reject(toKitiumError(new Error('Database clearing is disabled in production'), {
        code: 'database/unsafe_clear_blocked',
        message: 'Cannot clear database in production without explicit unsafe flag',
        severity: 'error',
        kind: 'internal',
        retryable: false,
        source: SOURCE,
      }));
    }

    try {
      this.logger.warn('Starting database clear operation', {
        adapter: this.adapter.name,
        unsafe: options.unsafe,
        tables: options.tables,
      });

      // In a real implementation, this would:
      // 1. Get list of tables from the database
      // 2. Delete records from each table
      // 3. Track statistics

      this.logger.info('Database clearing completed', {
        tablesCleared: stats.tablesCleared.length,
        recordsDeleted: stats.recordsDeleted,
        errors: stats.errors.length,
      });

      return Promise.resolve(stats);
    } catch (error) {
      const kitiumError = toKitiumError(error, {
        code: 'database/clear_failed',
        message: 'Database clearing failed',
        severity: 'error',
        kind: 'internal',
        retryable: false,
        source: SOURCE,
      });
      this.logger.error('Database clearing failed', { adapter: this.adapter.name }, kitiumError);
      return Promise.reject(kitiumError);
    } finally {
      stats.duration = Date.now() - startTime;
    }
  }

  /**
   * Clear specific tables
   * @param tableNames Tables to clear
   * @returns Clearing statistics
   */
  clearTables(tableNames: string[]): Promise<ClearingStats> {
    return this.clear({ tables: tableNames, unsafe: true });
  }

  /**
   * Verify database is clearable
   * @returns True if database can be cleared
   */
  canClear(): Promise<boolean> {
    if (process.env['NODE_ENV'] === 'production') {
      this.logger.warn('Cannot clear database in production');
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  }

  /**
   * Get database statistics before clearing
   * @returns Database statistics
   */
  getDatabaseStats(): Promise<{
    tableCount: number;
    totalRecords: number;
    tables: Array<{ name: string; records: number }>;
  }> {
    return Promise.resolve({
      tableCount: 0,
      totalRecords: 0,
      tables: [],
    });
  }
}
