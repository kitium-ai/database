/**
 * Retry coordinator service
 * Unified retry logic for all database operations
 */

import { sleep } from '@kitiumai/utils-ts';

import type { IRetryStrategy } from '../../interfaces/retry-strategy.interface';

export class RetryCoordinator {
  constructor(private strategy: IRetryStrategy) {}

  /**
   * Execute an operation with retry logic
   * @param operation Async operation to retry
   * @param options Retry configuration
   * @param options.maxRetries Maximum number of retries (default: 3)
   * @param options.baseDelay Base delay in milliseconds (default: 1000)
   * @param options.onRetry Optional callback before retry
   * @returns Operation result
   * @throws Last error if all retries are exhausted
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      onRetry?: (attempt: number, error: unknown) => void;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const baseDelay = options.baseDelay ?? 1000;
    const onRetry = options.onRetry;

    let attempt = 0;

    while (true) {
      try {
        return await operation();
      } catch (error) {
        // Check if we should retry
        if (!this.strategy.shouldRetry(attempt, maxRetries, error)) {
          throw error;
        }

        // Call retry callback if provided
        onRetry?.(attempt + 1, error);

        // Calculate delay and sleep
        const delay = this.strategy.calculateDelay(attempt, baseDelay);
        await sleep(delay);

        attempt++;
      }
    }
  }

  /**
   * Get the underlying retry strategy
   * @returns Current retry strategy
   */
  getStrategy(): IRetryStrategy {
    return this.strategy;
  }

  /**
   * Set a new retry strategy
   * @param strategy New strategy to use
   */
  setStrategy(strategy: IRetryStrategy): void {
    this.strategy = strategy;
  }
}
