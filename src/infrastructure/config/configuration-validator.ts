/**
 * Configuration validator for database configuration validation
 * Ensures all required configuration is present and valid
 */

import { ValidationError } from '@kitiumai/error';

import type { DatabaseConfig } from '../../types';

export class ConfigurationValidator {
  /**
   * Validate database configuration
   * @param config Configuration to validate
   * @throws ValidationError if validation fails
   */
  validate(config: DatabaseConfig): void {
    this.validateDatabaseUrl(config);
    this.validatePooling(config);
  }

  /**
   * Validate database URL is present
   * @param config Configuration to validate
   * @throws ValidationError if database URL is missing
   */
  private validateDatabaseUrl(config: DatabaseConfig): void {
    if (!config.databaseUrl) {
      throw new ValidationError({
        code: 'database/missing_url',
        message: 'DATABASE_URL is required for PostgreSQL operations.',
        severity: 'error',
        retryable: false,
      });
    }
  }

  /**
   * Validate pooling configuration
   * @param config Configuration to validate
   * @throws ValidationError if pooling config is invalid
   */
  private validatePooling(config: DatabaseConfig): void {
    if (!config.pooling) {
      throw new ValidationError({
        code: 'database/missing_pooling',
        message: 'Pooling configuration could not be resolved.',
        severity: 'error',
        retryable: false,
      });
    }

    const pooling = config.pooling;

    if (pooling.min < 0) {
      throw new ValidationError({
        code: 'database/invalid_pooling_min',
        message: 'Pool minimum connections must be non-negative.',
        severity: 'error',
        retryable: false,
      });
    }

    if (pooling.max < pooling.min) {
      throw new ValidationError({
        code: 'database/invalid_pooling_max',
        message: 'Pool maximum connections must be >= minimum.',
        severity: 'error',
        retryable: false,
      });
    }
  }
}
