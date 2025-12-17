/**
 * MongoDB client wrapper for database operations
 * Provides a type-safe wrapper around MongoClient
 */

import { MongoClient } from 'mongodb';

import type { DatabaseConfig } from '../../../types';

export type IMongoClientFactory = {
  createClient(config: DatabaseConfig): MongoClient;
};

/**
 * Factory for creating MongoDB client instances
 */
export class MongoClientFactory implements IMongoClientFactory {
  /**
   * Create a new MongoDB client instance
   * @param config Database configuration
   * @returns Configured MongoClient
   */
  createClient(config: DatabaseConfig): MongoClient {
    if (!config.mongo?.mongodbUrl) {
      throw new Error('MONGODB_URL is required for MongoDB');
    }

    const url = config.mongo.mongodbUrl;
    const poolSize = config.mongo.poolSize ?? 20;

    return new MongoClient(url, {
      maxPoolSize: poolSize,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });
  }
}

/**
 * Wrapper for MongoDB client with additional lifecycle management
 */
export class MongoClientWrapper {
  private client: MongoClient | null = null;

  constructor(private readonly factory: IMongoClientFactory) {}

  /**
   * Get or create MongoDB client
   * @param config Database configuration
   * @returns MongoClient instance
   */
  getOrCreate(config: DatabaseConfig): MongoClient {
    this.client ??= this.factory.createClient(config);
    return this.client;
  }

  /**
   * Get MongoDB client if initialized
   * @returns MongoClient or null
   */
  getClient(): MongoClient | null {
    return this.client;
  }

  /**
   * Check if client is initialized
   * @returns True if client is initialized
   */
  isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * Disconnect MongoDB client
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  /**
   * Reset client instance
   */
  reset(): void {
    this.client = null;
  }
}
