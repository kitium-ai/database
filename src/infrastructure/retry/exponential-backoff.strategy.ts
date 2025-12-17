/**
 * Exponential backoff retry strategy
 * Increases delay exponentially with each retry attempt
 */

import type { IRetryStrategy } from '../../core/interfaces/retry-strategy.interface';

export class ExponentialBackoffStrategy implements IRetryStrategy {
  /**
   * Calculate exponential backoff delay
   * Formula: baseDelay * (2 ^ attempt)
   * @param attempt Current attempt number (0-indexed)
   * @param baseDelay Base delay in milliseconds
   * @returns Delay in milliseconds
   */
  calculateDelay(attempt: number, baseDelay: number): number {
    return baseDelay * (2 ** attempt);
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
