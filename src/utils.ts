export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  {
    retries = 3,
    delay = 500,
    onRetry,
  }: { retries?: number; delay?: number; onRetry?: (attempt: number, error: unknown) => void } = {}
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      onRetry?.(attempt + 1, error);
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
      attempt++;
    }
  }

  throw lastError;
}

export function timeInMs(start: bigint, end: bigint): number {
  return Number((end - start) / BigInt(1_000_000));
}
