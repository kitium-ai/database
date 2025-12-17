/**
 * Database adapter interface for multi-database support
 */

import type { DatabaseConfig, HealthReport } from '../../types';

export type IDatabaseAdapter = {
  /**
   * Unique name of the database adapter (e.g., 'postgres', 'mongodb')
   */
  readonly name: HealthReport['service'];

  /**
   * Connect to the database
   * @param config Database configuration
   * @throws Error if connection fails
   */
  connect(config: Partial<DatabaseConfig>): Promise<void>;

  /**
   * Disconnect from the database
   * @throws Error if disconnection fails
   */
  disconnect(): Promise<void>;

  /**
   * Execute a raw query
   * @param query Query string or command
   * @param params Query parameters
   * @returns Query result
   */
  query<T>(query: string, params?: unknown[]): Promise<T>;

  /**
   * Perform a health check
   * @returns Health report
   */
  healthCheck(): Promise<HealthReport>;
};
