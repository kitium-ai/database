/**
 * @kitiumai/database
 * Enterprise-ready database package with Prisma ORM
 */

export { getDatabase, initializeDatabase } from './client';
export { createConnectionPool } from './pooling';
export type { DatabaseConfig, PoolingConfig } from './types';
export { migrationRunner } from './migrations';
export { seedDatabase } from './seed';
