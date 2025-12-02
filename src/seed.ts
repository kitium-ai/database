/**
 * Database seeding utilities
 */

import { getDatabase } from './client';
import type { SeedResult } from './types';

/**
 * Seed the database with initial data
 */
export async function seedDatabase(): Promise<SeedResult> {
  const db = getDatabase();
  let recordsCreated = 0;
  let recordsUpdated = 0;
  const errors: string[] = [];

  try {
    console.log('Seeding database...');

    // Seed admin user
    try {
      const adminExists = await db.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (!adminExists) {
        await db.user.create({
          data: {
            email: 'admin@kitiumai.local',
            name: 'Administrator',
            password: 'hashed_password_change_me', // TODO: Use bcrypt in production
            role: 'ADMIN',
            isActive: true,
          },
        });
        recordsCreated++;
        console.log('Admin user created');
      } else {
        recordsUpdated++;
        console.log('Admin user already exists');
      }
    } catch (error) {
      const message = `Failed to seed admin user: ${error instanceof Error ? error.message : String(error)}`;
      console.error(message);
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
        const userExists = await db.user.findUnique({
          where: { email: userData.email },
        });

        if (!userExists) {
          await db.user.create({
            data: {
              ...userData,
              password: 'hashed_password_change_me', // TODO: Use bcrypt in production
              isActive: true,
            },
          });
          recordsCreated++;
          console.log(`User ${userData.email} created`);
        }
      } catch (error) {
        const message = `Failed to seed user ${userData.email}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(message);
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
        const existingConfig = await db.appConfig.findUnique({
          where: { key: config.key },
        });

        if (!existingConfig) {
          await db.appConfig.create({
            data: config,
          });
          recordsCreated++;
        } else {
          await db.appConfig.update({
            where: { key: config.key },
            data: { value: config.value },
          });
          recordsUpdated++;
        }
      } catch (error) {
        const message = `Failed to seed config ${config.key}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(message);
        errors.push(message);
      }
    }

    console.log('Database seeding completed');

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
    console.error('Database seeding failed');
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
export async function clearDatabase(): Promise<SeedResult> {
  const db = getDatabase();

  try {
    console.warn('Clearing all data from the database...');

    // Delete in the correct order to respect foreign keys
    await db.auditLog.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
    await db.appConfig.deleteMany();

    console.log('Database cleared');

    return {
      success: true,
      message: 'Database cleared successfully',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to clear database');
    return {
      success: false,
      message: `Failed to clear database: ${errorMessage}`,
      errors: [errorMessage],
    };
  }
}
