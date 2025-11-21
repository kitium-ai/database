/**
 * Database migration automation script
 * Run with: ts-node scripts/migrate.ts
 */

import { initializeDatabase, disconnectDatabase } from '../src/client';
import { migrationRunner, isMigrationsUpToDate, getMigrationHistory } from '../src/migrations';

async function main() {
  try {
    const command = process.argv[2] || 'check';

    console.log('🔄 Database Migration Tool\n');

    // Initialize database
    await initializeDatabase();

    switch (command) {
      case 'check': {
        console.log('Checking migration status...\n');
        const isUpToDate = await isMigrationsUpToDate();

        if (isUpToDate) {
          console.log('✓ All migrations are up to date');
        } else {
          console.log('⚠️  Pending migrations detected');
        }
        break;
      }

      case 'history': {
        console.log('Migration History:\n');
        const history = await getMigrationHistory();

        if (history.length === 0) {
          console.log('No migrations found');
        } else {
          history.forEach((migration, index) => {
            console.log(`${index + 1}. ${migration.id}`);
            console.log(
              `   Status: ${migration.success ? '✓ Success' : '✗ Failed'}`
            );
            console.log(
              `   Finished: ${migration.finishedAt ? new Date(migration.finishedAt).toISOString() : 'N/A'}`
            );
            console.log(
              `   Execution Time: ${migration.executionTime}ms\n`
            );
          });
        }
        break;
      }

      case 'run': {
        console.log('Running pending migrations...\n');
        await migrationRunner();
        break;
      }

      default: {
        console.error(`Unknown command: ${command}`);
        console.log('\nAvailable commands:');
        console.log('  check   - Check migration status (default)');
        console.log('  history - Show migration history');
        console.log('  run     - Run pending migrations');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('✗ Migration error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();
