/**
 * Database seeding utilities
 */

import { getLogger, type IAdvancedLogger } from '@kitiumai/logger';
import bcrypt from 'bcryptjs';

import { getDatabase } from './client';
import { loadDatabaseConfig } from './config';
import type { DatabaseConfig, SeedResult } from './types';

const baseLogger = getLogger();
const logger: ReturnType<typeof getLogger> =
  'child' in baseLogger && typeof baseLogger.child === 'function'
    ? (baseLogger as IAdvancedLogger).child({ component: 'database-seed' })
    : baseLogger;

type SeedStats = { created: number; updated: number; errors: string[] };

async function seedAdminUser(
  db: ReturnType<typeof getDatabase>,
  hashedPassword: string,
  stats: SeedStats
): Promise<void> {
  const adminEmail = 'admin@kitiumai.local';
  try {
    const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });
    await db.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
      update: {
        password: hashedPassword,
        isActive: true,
      },
    });
    if (existingAdmin) {
      stats.updated++;
    } else {
      stats.created++;
    }
    logger.info('Admin user ensured');
  } catch (error) {
    const message = `Failed to seed admin user: ${error instanceof Error ? error.message : String(error)}`;
    logger.error('Failed to seed admin user', { email: adminEmail }, error instanceof Error ? error : undefined);
    stats.errors.push(message);
  }
}

type UserData = { email: string; name: string; role: 'USER' | 'GUEST' };

const DEFAULT_USERS: UserData[] = [
  { email: 'user@kitiumai.local', name: 'Default User', role: 'USER' },
  { email: 'guest@kitiumai.local', name: 'Guest User', role: 'GUEST' },
];

async function seedDefaultUsers(
  db: ReturnType<typeof getDatabase>,
  hash: (password: string) => Promise<string>,
  defaultPassword: string,
  stats: SeedStats
): Promise<void> {

  for (const userData of DEFAULT_USERS) {
    try {
      const existingUser = await db.user.findUnique({ where: { email: userData.email } });
      await db.user.upsert({
        where: { email: userData.email },
        create: {
          ...userData,
          password: await hash(defaultPassword),
          isActive: true,
        },
        update: { isActive: true },
      });
      if (existingUser) {
        stats.updated++;
      } else {
        stats.created++;
      }
      logger.info(`User ${userData.email} ensured`);
    } catch (error) {
      const message = `Failed to seed user ${userData.email}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Failed to seed user', { email: userData.email }, error instanceof Error ? error : undefined);
      stats.errors.push(message);
    }
  }
}

async function seedAppConfig(
  db: ReturnType<typeof getDatabase>,
  stats: SeedStats
): Promise<void> {
  const appConfigs = [
    { key: 'app.name', value: 'Kitium AI Database', category: 'application' },
    { key: 'app.version', value: '1.0.0', category: 'application' },
    { key: 'db.version', value: '1.0.0', category: 'database' },
    { key: 'features.audit_logging', value: 'true', category: 'features' },
    { key: 'features.user_sessions', value: 'true', category: 'features' },
  ];

  for (const appConfig of appConfigs) {
    try {
      const existingConfig = await db.appConfig.findUnique({ where: { key: appConfig.key } });
      await db.appConfig.upsert({
        where: { key: appConfig.key },
        update: { value: appConfig.value },
        create: appConfig,
      });
      if (existingConfig) {
        stats.updated++;
      } else {
        stats.created++;
      }
    } catch (error) {
      const message = `Failed to seed config ${appConfig.key}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error('Failed to seed config', { key: appConfig.key }, error instanceof Error ? error : undefined);
      stats.errors.push(message);
    }
  }
}

const DEFAULT_ADMIN_PASSWORD = 'ChangeMe!123';

/**
 * Seed the database with initial data
 */
export async function seedDatabase(config: Partial<DatabaseConfig> = {}): Promise<SeedResult> {
  const db = getDatabase();
  const resolvedConfig = loadDatabaseConfig(config);

  const hash =
    resolvedConfig.passwordHasher ?? ((password: string) => bcrypt.hash(password, 10));
  const defaultPassword = resolvedConfig.defaultAdminPassword ?? DEFAULT_ADMIN_PASSWORD;
  const adminPassword = await hash(defaultPassword);
  const stats: SeedStats = { created: 0, updated: 0, errors: [] };

  try {
    logger.info('Seeding database...');

    await seedAdminUser(db, adminPassword, stats);
    await seedDefaultUsers(db, hash, defaultPassword, stats);
    await seedAppConfig(db, stats);

    logger.info('Database seeding completed');

    return {
      success: stats.errors.length === 0,
      message:
        stats.errors.length === 0
          ? `Successfully seeded ${stats.created} records (${stats.updated} updated)`
          : `Seeding completed with ${stats.errors.length} error(s)`,
      recordsCreated: stats.created,
      recordsUpdated: stats.updated,
      ...(stats.errors.length > 0 ? { errors: stats.errors } : {}),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Database seeding failed', undefined, error instanceof Error ? error : undefined);
    return {
      success: false,
      message: `Database seeding failed: ${errorMessage}`,
      errors: [errorMessage],
    };
  }
}

/**
 * Clear all data from the database (use with caution!)
 */
export async function clearDatabase(config: Partial<DatabaseConfig> = {}): Promise<SeedResult> {
  const db = getDatabase();
  const resolvedConfig = loadDatabaseConfig(config);

  if (!resolvedConfig.unsafeAllowClearDatabase) {
    return {
      success: false,
      message: 'Clearing the database is disabled. Set ALLOW_CLEAR_DATABASE=true to enable.',
    };
  }

  try {
    logger.warn('Clearing all data from the database...');

    // Delete in the correct order to respect foreign keys
    await db.auditLog.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
    await db.appConfig.deleteMany();

    logger.info('Database cleared');

    return {
      success: true,
      message: 'Database cleared successfully',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to clear database', undefined, error instanceof Error ? error : undefined);
    return {
      success: false,
      message: `Failed to clear database: ${errorMessage}`,
      errors: [errorMessage],
    };
  }
}
