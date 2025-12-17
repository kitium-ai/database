/**
 * Health check provider interface for database health monitoring
 */

import type { HealthReport } from '../../types';

export type IHealthCheckProvider = {
  /**
   * Perform a health check on the database
   * @returns Health report with status and optional details
   */
  check(): Promise<HealthReport>;
};
