/**
 * Seed orchestrator service
 * Coordinates seeding operations with pluggable strategies
 */

import { toKitiumError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

import type { ISeedStrategy } from '../../interfaces';

const SOURCE = '@kitiumai/database';

/**
 * Seeding statistics
 */
export type SeedingStats = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ item: string; error: string }>;
  totalDuration: number;
};

/**
 * Orchestrates database seeding with multiple strategies
 */
export class SeedOrchestrator {
  private readonly logger: ReturnType<typeof getLogger>;
  private readonly strategies: Map<string, ISeedStrategy> = new Map();

  constructor() {
    const baseLogger = getLogger();
    this.logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'seed-orchestrator' })
      : baseLogger;
  }

  /**
   * Register a seeding strategy
   * @param name Strategy name
   * @param strategy Seeding strategy
   */
  registerStrategy(name: string, strategy: ISeedStrategy): void {
    this.strategies.set(name, strategy);
    this.logger.debug('Seeding strategy registered', { name });
  }

  /**
   * Execute seeding for a specific strategy
   * @param strategyName Name of the strategy to execute
   * @param options Seeding options
   * @returns Seeding statistics
   */
  async seed(strategyName: string, options: Record<string, unknown> = {}): Promise<SeedingStats> {
    const startTime = Date.now();
    this.logger.info('Starting seeding', { strategy: strategyName });
    void options;

    const stats: SeedingStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      totalDuration: 0,
    };

    try {
      const strategy = this.strategies.get(strategyName);
      if (!strategy) {
        throw new Error(`Seeding strategy '${strategyName}' not registered`);
      }

      const result = await strategy.execute();
      stats.created = result.created;
      stats.updated = result.updated;
      stats.skipped = 0;
      stats.errors = (result.errors ?? []).map((message) => ({ item: strategyName, error: message }));

      this.logger.info('Seeding completed', {
        strategy: strategyName,
        created: stats.created,
        updated: stats.updated,
        errors: stats.errors.length,
      });

      return stats;
    } catch (error) {
      const kitiumError = toKitiumError(error, {
        code: 'database/seeding_failed',
        message: `Seeding with strategy '${strategyName}' failed`,
        severity: 'error',
        kind: 'internal',
        retryable: false,
        source: SOURCE,
      });
      this.logger.error('Seeding failed', { strategy: strategyName }, kitiumError);
      throw kitiumError;
    } finally {
      stats.totalDuration = Date.now() - startTime;
    }
  }

  /**
   * Execute all registered strategies
   * @param options Seeding options
   * @returns Map of strategy names to statistics
   */
  async seedAll(options: Record<string, unknown> = {}): Promise<Map<string, SeedingStats>> {
    this.logger.info('Starting full seeding', { strategies: this.strategies.size });

    const results = new Map<string, SeedingStats>();

    for (const [strategyName] of this.strategies) {
      try {
        const stats = await this.seed(strategyName, options);
        results.set(strategyName, stats);
      } catch (error) {
        this.logger.error('Strategy seeding failed', { strategy: strategyName }, error instanceof Error ? error : undefined);
        // Continue with next strategy
      }
    }

    return results;
  }

  /**
   * Get seeding strategy
   * @param name Strategy name
   * @returns Seeding strategy or undefined
   */
  getStrategy(name: string): ISeedStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get list of registered strategy names
   * @returns Array of strategy names
   */
  getStrategyNames(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Check if strategy is registered
   * @param name Strategy name
   * @returns True if registered
   */
  hasStrategy(name: string): boolean {
    return this.strategies.has(name);
  }

  /**
   * Unregister a strategy
   * @param name Strategy name
   * @returns True if strategy was unregistered
   */
  unregisterStrategy(name: string): boolean {
    const didDelete = this.strategies.delete(name);
    if (didDelete) {
      this.logger.debug('Seeding strategy unregistered', { name });
    }
    return didDelete;
  }

  /**
   * Clear all registered strategies
   */
  clear(): void {
    this.strategies.clear();
    this.logger.debug('Seed orchestrator cleared');
  }

  /**
   * Get strategy count
   * @returns Number of registered strategies
   */
  count(): number {
    return this.strategies.size;
  }
}
