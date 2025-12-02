import { MongoClient } from 'mongodb';
import { InternalError } from '@kitiumai/error';
import { loadDatabaseConfig } from './config';
import type { DatabaseConfig, HealthReport } from './types';
import { logStructured } from './observability';
import { retryWithBackoff } from './utils';

let mongoClient: MongoClient | null = null;

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

  const client = new MongoClient(resolved.mongo.mongodbUrl, {
    ...(resolved.mongo.poolSize !== undefined ? { maxPoolSize: resolved.mongo.poolSize } : {}),
    minPoolSize: Math.min(2, resolved.mongo.poolSize || 2),
    ...(resolved.pooling?.connectionTimeoutMillis !== undefined
      ? { serverSelectionTimeoutMS: resolved.pooling.connectionTimeoutMillis }
      : {}),
  });

  await retryWithBackoff(
    async () => {
      await client.connect();
      await client.db(resolved.mongo?.dbName).command({ ping: 1 });
    },
    {
      ...(resolved.retry?.maxRetries !== undefined ? { retries: resolved.retry.maxRetries } : {}),
      ...(resolved.retry?.retryDelay !== undefined ? { delay: resolved.retry.retryDelay } : {}),
      onRetry: (attempt, error) =>
        logStructured('warn', 'Retrying MongoDB connection', {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        }),
    }
  );

  mongoClient = client;
  logStructured('info', 'MongoDB connection established', { db: resolved.mongo?.dbName });
  return mongoClient;
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
    logStructured('info', 'MongoDB connection closed');
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
