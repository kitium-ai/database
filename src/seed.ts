/**
 * Database seeding utilities
 */

import bcrypt from 'bcryptjs';
import { getDatabase } from './client';
import { loadDatabaseConfig } from './config';
import type { DatabaseConfig, SeedResult } from './types';
import { logStructured } from './observability';

/**
 * Seed the database with initial data
 */
export async function seedDatabase(config: Partial<DatabaseConfig> = {}): Promise<SeedResult> {
  const db = getDatabase();
  const resolvedConfig = loadDatabaseConfig(config);
  let recordsCreated = 0;
  let recordsUpdated = 0;
  const errors: string[] = [];

  const hash =
    resolvedConfig.passwordHasher || (async (password: string) => bcrypt.hash(password, 10));
  const adminPassword = await hash(resolvedConfig.defaultAdminPassword || 'ChangeMe!123');

  try {
    logStructured('info', 'Seeding database...');

    // Seed admin user
    try {
      const existingAdmin = await db.user.findUnique({ where: { email: 'admin@kitiumai.local' } });
      await db.user.upsert({
        where: { email: 'admin@kitiumai.local' },
        create: {
          email: 'admin@kitiumai.local',
          name: 'Administrator',
          password: adminPassword,
          role: 'ADMIN',
          isActive: true,
        },
        update: {
          password: adminPassword,
          isActive: true,
        },
      });
      if (existingAdmin) {
        recordsUpdated++;
      } else {
        recordsCreated++;
      }
      logStructured('info', 'Admin user ensured');
    } catch (error) {
      const message = `Failed to seed admin user: ${error instanceof Error ? error.message : String(error)}`;
      logStructured('error', message);
      errors.push(message);
    }

    // Seed default users
    const defaultUsers = [
      {
        email: 'user@kitiumai.local',
        name: 'Default User',
        role: 'USER' as const,
      },
      {
        email: 'guest@kitiumai.local',
        name: 'Guest User',
        role: 'GUEST' as const,
      },
    ];

    for (const userData of defaultUsers) {
      try {
        const existingUser = await db.user.findUnique({ where: { email: userData.email } });

        await db.user.upsert({
          where: { email: userData.email },
          create: {
            ...userData,
            password: await hash(resolvedConfig.defaultAdminPassword || 'ChangeMe!123'),
            isActive: true,
          },
          update: {
            isActive: true,
          },
        });
        if (existingUser) {
          recordsUpdated++;
        } else {
          recordsCreated++;
        }
        logStructured('info', `User ${userData.email} ensured`);
      } catch (error) {
        const message = `Failed to seed user ${userData.email}: ${error instanceof Error ? error.message : String(error)}`;
        logStructured('error', message);
        errors.push(message);
      }
    }

    // Seed application configuration
    const configs = [
      {
        key: 'app.name',
        value: 'Kitium AI Database',
        category: 'application',
      },
      {
        key: 'app.version',
        value: '1.0.0',
        category: 'application',
      },
      {
        key: 'db.version',
        value: '1.0.0',
        category: 'database',
      },
      {
        key: 'features.audit_logging',
        value: 'true',
        category: 'features',
      },
      {
        key: 'features.user_sessions',
        value: 'true',
        category: 'features',
      },
    ];

    for (const config of configs) {
      try {
        const existingConfig = await db.appConfig.findUnique({ where: { key: config.key } });

        await db.appConfig.upsert({
          where: { key: config.key },
          update: { value: config.value },
          create: config,
        });
        if (existingConfig) {
          recordsUpdated++;
        } else {
          recordsCreated++;
        }
      } catch (error) {
        const message = `Failed to seed config ${config.key}: ${error instanceof Error ? error.message : String(error)}`;
        logStructured('error', message);
        errors.push(message);
      }
    }

    logStructured('info', 'Database seeding completed');

    return {
      success: errors.length === 0,
      message:
        errors.length === 0
          ? `Successfully seeded ${recordsCreated} records (${recordsUpdated} updated)`
          : `Seeding completed with ${errors.length} error(s)`,
      recordsCreated,
      recordsUpdated,
      ...(errors.length > 0 ? { errors } : {}),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStructured('error', 'Database seeding failed', { error: errorMessage });
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
    logStructured('warn', 'Clearing all data from the database...');

    // Delete in the correct order to respect foreign keys
    await db.auditLog.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
    await db.appConfig.deleteMany();

    logStructured('info', 'Database cleared');

    return {
      success: true,
      message: 'Database cleared successfully',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStructured('error', 'Failed to clear database', { error: errorMessage });
    return {
      success: false,
      message: `Failed to clear database: ${errorMessage}`,
      errors: [errorMessage],
    };
  }
}
