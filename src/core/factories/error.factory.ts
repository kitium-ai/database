/**
 * Database error factory for creating consistent, structured errors
 * Eliminates duplication of error handling logic
 */

import { toKitiumError } from '@kitiumai/error';

export class DatabaseErrorFactory {
  private readonly source = '@kitiumai/database';

  /**
   * Create a connection error
   * @param error Original error
   * @param _context Additional context for logging
   * @returns Kitium-formatted error
   */
  createConnectionError(error: unknown, _context?: Record<string, unknown>): unknown {
    return toKitiumError(error, {
      code: 'database/connection_failed',
      message: 'Database connection failed',
      severity: 'error',
      kind: 'dependency',
      retryable: true,
      source: this.source,
    });
  }

  /**
   * Create a query execution error
   * @param error Original error
   * @param _query Query that failed
   * @returns Kitium-formatted error
   */
  createQueryError(error: unknown, _query?: string): unknown {
    return toKitiumError(error, {
      code: 'database/query_failed',
      message: 'Database query failed',
      severity: 'error',
      kind: 'internal',
      retryable: false,
      source: this.source,
    });
  }

  /**
   * Create a migration error
   * @param error Original error
   * @returns Kitium-formatted error
   */
  createMigrationError(error: unknown): unknown {
    return toKitiumError(error, {
      code: 'database/migration_failed',
      message: 'Database migration failed',
      severity: 'error',
      kind: 'internal',
      retryable: false,
      source: this.source,
    });
  }

  /**
   * Create a seed error
   * @param error Original error
   * @returns Kitium-formatted error
   */
  createSeedError(error: unknown): unknown {
    return toKitiumError(error, {
      code: 'database/seed_failed',
      message: 'Database seeding failed',
      severity: 'error',
      kind: 'internal',
      retryable: false,
      source: this.source,
    });
  }

  /**
   * Create a validation error
   * @param message Error message
   * @returns Kitium-formatted error
   */
  createValidationError(message: string): unknown {
    return toKitiumError(new Error(message), {
      code: 'database/validation_failed',
      message,
      severity: 'error',
      kind: 'internal',
      retryable: false,
      source: this.source,
    });
  }

  /**
   * Create a not initialized error
   * @param service Service name (e.g., 'PostgreSQL', 'MongoDB')
   * @returns Kitium-formatted error
   */
  createNotInitializedError(service: string): unknown {
    return toKitiumError(
      new Error(`${service} client not initialized`),
      {
        code: 'database/not_initialized',
        message: `${service} client not initialized. Call initialization method first.`,
        severity: 'error',
        kind: 'internal',
        retryable: false,
        source: this.source,
      }
    );
  }
}
