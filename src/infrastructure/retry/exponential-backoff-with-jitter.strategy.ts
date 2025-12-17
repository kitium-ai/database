/**
 * Exponential backoff with jitter retry strategy
 * Adds randomization to prevent thundering herd problem
 */

import type { IRetryStrategy } from '../../core/interfaces/retry-strategy.interface';

export class ExponentialBackoffWithJitterStrategy implements IRetryStrategy {
  /**
   * Jitter percentage (0-1)
   * Default: 0.1 (10% jitter)
   */
  private readonly jitterFactor: number;

  constructor(jitterFactor = 0.1) {
    if (jitterFactor < 0 || jitterFactor > 1) {
      throw new Error('Jitter factor must be between 0 and 1');
    }
    this.jitterFactor = jitterFactor;
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Formula: baseDelay * (2 ^ attempt) + random jitter
   * @param attempt Current attempt number (0-indexed)
   * @param baseDelay Base delay in milliseconds
   * @returns Delay in milliseconds with jitter applied
   */
  calculateDelay(attempt: number, baseDelay: number): number {
    const exponentialDelay = baseDelay * (2 ** attempt);
    const jitter = Math.random() * exponentialDelay * this.jitterFactor;
    return exponentialDelay + jitter;
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
