/**
 * Prisma client wrapper for PostgreSQL database operations
 * Provides a type-safe wrapper around PrismaClient
 */

import {
  getPrismaClientConstructor,
  type PrismaClientInstance,
} from '../../../shared/prisma';
import type { DatabaseConfig } from '../../../types';

export type IPrismaClientFactory = {
  createClient(config: DatabaseConfig): PrismaClientInstance;
};

/**
 * Factory for creating Prisma client instances
 */
export class PrismaClientFactory implements IPrismaClientFactory {
  /**
   * Create a new Prisma client instance
   * @param config Database configuration
   * @returns Configured PrismaClient
   */
  createClient(config: DatabaseConfig): PrismaClientInstance {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is required for PostgreSQL');
    }

    const PrismaClientConstructor = getPrismaClientConstructor();
    return new PrismaClientConstructor({
      datasources: {
        db: {
          url: config.databaseUrl,
        },
      },
      ...(config.enableLogging && {
        log: this.getPrismaLogLevels(config.logLevel),
      }),
    });
  }

  /**
   * Convert app log level to Prisma log levels
   * @param logLevel App log level
   * @returns Prisma log configuration
   */
  private getPrismaLogLevels(
    logLevel: 'debug' | 'info' | 'warn' | 'error' | undefined
  ): Array<'query' | 'info' | 'warn' | 'error'> {
    switch (logLevel) {
      case 'debug':
        return ['query', 'info', 'warn', 'error'];
      case 'info':
        return ['info', 'warn', 'error'];
      case 'warn':
        return ['warn', 'error'];
      case 'error':
        return ['error'];
      case undefined:
      default:
        return [];
    }
  }
}

/**
 * Wrapper for Prisma client with additional lifecycle management
 */
export class PrismaClientWrapper {
  private client: PrismaClientInstance | null = null;

  constructor(private readonly factory: IPrismaClientFactory) {}

  /**
   * Get or create Prisma client
   * @param config Database configuration
   * @returns PrismaClient instance
   */
  getOrCreate(config: DatabaseConfig): PrismaClientInstance {
    this.client ??= this.factory.createClient(config);
    return this.client;
  }

  /**
   * Get Prisma client if initialized
   * @returns PrismaClient or null
   */
  getClient(): PrismaClientInstance | null {
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
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
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
