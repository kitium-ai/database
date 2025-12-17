/**
 * Health check orchestrator
 * Coordinates health checks across multiple database adapters
 */

import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';

import type { HealthReport } from '../../../types';
import type { IDatabaseAdapter } from '../../interfaces';

/**
 * Orchestrates health checks for multiple database adapters
 */
export class HealthCheckOrchestrator {
  private readonly logger: ReturnType<typeof getLogger>;

  constructor(private readonly adapters: IDatabaseAdapter[] = []) {
    const baseLogger = getLogger();
    this.logger = 'child' in baseLogger && typeof baseLogger.child === 'function'
      ? (baseLogger as IAdvancedLogger).child({ component: 'health-check-orchestrator' })
      : baseLogger;
  }

  /**
   * Check health of all adapters
   * @returns Array of health reports
   */
  async checkAll(): Promise<HealthReport[]> {
    this.logger.debug('Checking health of all adapters', { count: this.adapters.length });

    const reports = await Promise.all(
      this.adapters.map((adapter) =>
        adapter.healthCheck().catch((error) => ({
          service: adapter.name,
          status: 'unhealthy' as const,
          details: {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        }))
      )
    );

    return reports;
  }

  /**
   * Check health of a specific adapter
   * @param adapterName Name of the adapter
   * @returns Health report
   * @throws Error if adapter not found
   */
  async check(adapterName: HealthReport['service']): Promise<HealthReport> {
    const adapter = this.adapters.find((a) => a.name === adapterName);
    if (!adapter) {
      throw new Error(`Adapter '${adapterName}' not found in orchestrator`);
    }

    try {
      return await adapter.healthCheck();
    } catch (error) {
      return {
        service: adapterName,
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Check if all adapters are healthy
   * @returns True if all adapters are healthy
   */
  async isHealthy(): Promise<boolean> {
    const reports = await this.checkAll();
    return reports.every((report) => report.status === 'ready');
  }

  /**
   * Get aggregated health status
   * @returns Overall health status
   */
  async getAggregatedStatus(): Promise<'ready' | 'degraded' | 'unhealthy'> {
    const reports = await this.checkAll();

    if (reports.length === 0) {
      return 'unhealthy';
    }

    const healthyCount = reports.filter((r) => r.status === 'ready').length;
    const totalCount = reports.length;

    if (healthyCount === totalCount) {
      return 'ready';
    }

    if (healthyCount > 0) {
      return 'degraded';
    }

    return 'unhealthy';
  }

  /**
   * Add adapter to orchestrator
   * @param adapter Adapter to add
   */
  addAdapter(adapter: IDatabaseAdapter): void {
    if (!this.adapters.find((a) => a.name === adapter.name)) {
      this.adapters.push(adapter);
      this.logger.debug('Adapter added to orchestrator', { adapter: adapter.name });
    }
  }

  /**
   * Remove adapter from orchestrator
   * @param adapterName Name of adapter to remove
   * @returns True if adapter was removed
   */
  removeAdapter(adapterName: string): boolean {
    const index = this.adapters.findIndex((a) => a.name === adapterName);
    if (index >= 0) {
      this.adapters.splice(index, 1);
      this.logger.debug('Adapter removed from orchestrator', { adapter: adapterName });
      return true;
    }
    return false;
  }

  /**
   * Get list of adapter names
   * @returns Array of adapter names
   */
  getAdapterNames(): string[] {
    return this.adapters.map((a) => a.name);
  }

  /**
   * Get adapter count
   * @returns Number of adapters
   */
  count(): number {
    return this.adapters.length;
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.length = 0;
    this.logger.debug('Health check orchestrator cleared');
  }
}
