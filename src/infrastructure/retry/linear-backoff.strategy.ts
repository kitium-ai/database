/**
 * Linear backoff retry strategy
 * Increases delay linearly with each retry attempt
 */

import type { IRetryStrategy } from '../../core/interfaces/retry-strategy.interface';

export class LinearBackoffStrategy implements IRetryStrategy {
  /**
   * Calculate linear backoff delay
   * Formula: baseDelay * (attempt + 1)
   * @param attempt Current attempt number (0-indexed)
   * @param baseDelay Base delay in milliseconds
   * @returns Delay in milliseconds
   */
  calculateDelay(attempt: number, baseDelay: number): number {
    return baseDelay * (attempt + 1);
  }

  /**
   * Determine if operation should be retried
   * @param attempt Current attempt number
   * @param maxRetries Maximum number of retries
   * @param _error The error that occurred
   * @returns true if within retry limit
   */
  shouldRetry(attempt: number, maxRetries: number, _error: unknown): boolean {
    return attempt < maxRetries;
  }
}
