/**
 * Seed script for the database
 * Run with: npm run db:seed
 */

import { initializeDatabase, disconnectDatabase } from '../src/client';
import { seedDatabase } from '../src/seed';

async function main() {
  try {
    console.log('🚀 Starting database seed...\n');

    // Initialize database
    await initializeDatabase();

    // Run seed
    const result = await seedDatabase();

    if (result.success) {
      console.log('\n✓ Seeding completed successfully');
      console.log(`  Records created: ${result.recordsCreated}`);
      console.log(`  Records updated: ${result.recordsUpdated}`);
    } else {
      console.error('\n✗ Seeding completed with errors');
      if (result.errors && result.errors.length > 0) {
        console.error('  Errors:');
        result.errors.forEach((err) => console.error(`    - ${err}`));
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Seed script failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();
