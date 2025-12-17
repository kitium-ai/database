/**
 * Retry strategy interface for pluggable retry behavior
 */

export type IRetryStrategy = {
  /**
   * Calculate the delay for the next retry attempt
   * @param attempt Current attempt number (0-indexed)
   * @param baseDelay Base delay in milliseconds
   * @returns Delay in milliseconds for this attempt
   */
  calculateDelay(attempt: number, baseDelay: number): number;

  /**
   * Determine if an operation should be retried
   * @param attempt Current attempt number (0-indexed)
   * @param maxRetries Maximum number of retries allowed
   * @param error The error that occurred
   * @returns true if the operation should be retried
   */
  shouldRetry(attempt: number, maxRetries: number, error: unknown): boolean;
};
