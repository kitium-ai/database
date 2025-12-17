/**
 * MongoDB client initialization and management (Legacy Facade)
 * @deprecated Use MongoAdapter from the new architecture instead
 * This file will be removed in v2.0.0
 */

import { InternalError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';
import type { MongoClient } from 'mongodb';

import { MongoAdapter } from '../infrastructure/adapters/mongodb/mongo.adapter';
import { ExponentialBackoffStrategy } from '../infrastructure/retry/exponential-backoff.strategy';
import type { DatabaseConfig, HealthReport } from '../types';

let mongoAdapter: MongoAdapter | null = null;

const baseLogger = getLogger();
const logger: ReturnType<typeof getLogger> =
  'child' in baseLogger && typeof baseLogger.child === 'function'
    ? (baseLogger as IAdvancedLogger).child({ component: 'database-mongo' })
    : baseLogger;

/**
 * Initialize the MongoDB database client
 * @deprecated Use MongoAdapter.connect() instead
 */
export async function initializeMongoDatabase(
  config: Partial<DatabaseConfig> = {}
): Promise<MongoClient> {
  if (mongoAdapter?.isConnected()) {
    return mongoAdapter.getClient();
  }

  const resolvedConfig = { ...config } as DatabaseConfig;

  // Ensure mongo config exists
  if (!resolvedConfig.mongo?.mongodbUrl) {
    throw new InternalError({
      code: 'database/mongo_missing_url',
      message: 'MONGODB_URL is not defined. Provide it via environment or config.',
      severity: 'error',
      retryable: false,
    });
  }

  // Create adapter with exponential backoff strategy
  mongoAdapter = new MongoAdapter(new ExponentialBackoffStrategy());

  try {
    await mongoAdapter.connect(resolvedConfig);
    return mongoAdapter.getClient();
  } catch (error) {
    mongoAdapter = null;
    throw error;
  }
}

/**
 * Get the MongoDB client instance
 * @deprecated Use MongoAdapter.getClient() instead
 */
export function getMongoDatabase(): MongoClient {
  if (!mongoAdapter?.isConnected()) {
    throw new InternalError({
      code: 'database/mongo_not_initialized',
      message: 'Mongo client not initialized. Call initializeMongoDatabase() first.',
      severity: 'error',
      retryable: false,
    });
  }
  return mongoAdapter.getClient();
}

/**
 * Disconnect from the MongoDB database
 * @deprecated Use MongoAdapter.disconnect() instead
 */
export async function disconnectMongoDatabase(): Promise<void> {
  if (mongoAdapter) {
    await mongoAdapter.disconnect();
    mongoAdapter = null;
    logger.info('MongoDB connection closed');
  }
}

/**
 * Get MongoDB health check status
 * @deprecated Use MongoAdapter.healthCheck() instead
 */
export async function mongoHealthCheck(): Promise<HealthReport> {
  if (!mongoAdapter?.isConnected()) {
    return {
      service: 'mongodb',
      status: 'unhealthy',
      details: { error: 'Database not initialized' },
    };
  }

  try {
    return await mongoAdapter.healthCheck();
  } catch (error) {
    return {
      service: 'mongodb',
      status: 'unhealthy',
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}
