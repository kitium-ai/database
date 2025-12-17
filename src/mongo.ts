import { InternalError, toKitiumError } from '@kitiumai/error';
import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';
import { sleep } from '@kitiumai/utils-ts';
import { MongoClient } from 'mongodb';

import { loadDatabaseConfig } from './config';
import type { DatabaseConfig, HealthReport } from './types';

const baseLogger = getLogger();
const logger: ReturnType<typeof getLogger> =
  'child' in baseLogger && typeof baseLogger.child === 'function'
    ? (baseLogger as IAdvancedLogger).child({ component: 'database-mongo' })
    : baseLogger;

let mongoClient: MongoClient | null = null;

const SOURCE = '@kitiumai/database';

type MongoOptions = {
  maxPoolSize?: number;
  minPoolSize: number;
  serverSelectionTimeoutMS?: number;
};

function buildMongoOptions(config: DatabaseConfig): MongoOptions {
  const options: MongoOptions = {
    minPoolSize: Math.min(2, config.mongo?.poolSize ?? 2),
  };

  if (config.mongo?.poolSize !== undefined) {
    options.maxPoolSize = config.mongo.poolSize;
  }

  if (config.pooling?.connectionTimeoutMillis !== undefined) {
    options.serverSelectionTimeoutMS = config.pooling.connectionTimeoutMillis;
  }

  return options;
}

async function connectMongoWithRetry(
  client: MongoClient,
  config: DatabaseConfig
): Promise<void> {
  const maxRetries = config.retry?.maxRetries ?? 3;
  const retryDelay = config.retry?.retryDelay ?? 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await client.connect();
      await client.db(config.mongo?.dbName).command({ ping: 1 });
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      logger.warn('Retrying MongoDB connection', {
        attempt: attempt + 1,
        maxRetries,
        error: error instanceof Error ? error : undefined,
      });
      await sleep(retryDelay * 2 ** attempt);
    }
  }
}

export async function initializeMongoDatabase(
  config: Partial<DatabaseConfig> = {}
): Promise<MongoClient> {
  if (mongoClient) {
    return mongoClient;
  }
  const resolved = loadDatabaseConfig(config);

  if (!resolved.mongo?.mongodbUrl) {
    throw new InternalError({
      code: 'database/mongo_missing_url',
      message: 'MONGODB_URL is not defined. Provide it via environment or config.',
      severity: 'error',
      retryable: false,
    });
  }

  const client = new MongoClient(resolved.mongo.mongodbUrl, buildMongoOptions(resolved));
  let lastError: unknown;

  try {
    await connectMongoWithRetry(client, resolved);
  } catch (error) {
    lastError = error;
  }

  if (!lastError) {
    mongoClient = client;
    logger.info('MongoDB connection established', { db: resolved.mongo?.dbName ?? 'default' });
    return mongoClient;
  }

  const kitiumError = toKitiumError(lastError, {
    code: 'database/mongo_connection_failed',
    message: 'MongoDB connection failed after retries',
    severity: 'error',
    kind: 'dependency',
    retryable: true,
    source: SOURCE,
  });
  logger.error('Failed to connect to MongoDB', undefined, kitiumError);
  throw kitiumError;
}

export function getMongoDatabase(): MongoClient {
  if (!mongoClient) {
    throw new InternalError({
      code: 'database/mongo_not_initialized',
      message: 'Mongo client not initialized. Call initializeMongoDatabase() first.',
      severity: 'error',
      retryable: false,
    });
  }
  return mongoClient;
}

export async function disconnectMongoDatabase(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    logger.info('MongoDB connection closed');
    mongoClient = null;
  }
}

export async function mongoHealthCheck(): Promise<HealthReport> {
  try {
    const client = getMongoDatabase();
    await client.db().command({ ping: 1 });
    return { service: 'mongodb', status: 'ready' };
  } catch (error) {
    return {
      service: 'mongodb',
      status: 'unhealthy',
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}
