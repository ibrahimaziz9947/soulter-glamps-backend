/**
 * Backfill Finance Entries for Existing Bookings
 * 
 * This script posts all existing CONFIRMED/COMPLETED bookings to Finance (Income + Statements)
 * that don't already have corresponding income entries.
 * 
 * Usage:
 * - Dry run (preview): node backfill-booking-finance.js --dry-run
 * - Actual execution: node backfill-booking-finance.js
 */

import prisma from './src/config/prisma.js';
import { backfillBookingFinanceEntries } from './src/services/financeIntegration.service.js';

console.log('========================================');
console.log('🔄 Backfill Booking Finance Entries');
console.log('========================================\n');

// Get command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('⚠️  DRY RUN MODE - No changes will be made\n');
} else {
  console.log('⚠️  LIVE MODE - Finance entries will be created\n');
}

async function run() {
  try {
    // Get a super admin user ID for audit trail
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (!superAdmin) {
      throw new Error('No SUPER_ADMIN user found. Please create one first.');
    }

    console.log('Using user for audit trail:', superAdmin.email);
    console.log('');

    // Run backfill
    const stats = await backfillBookingFinanceEntries(superAdmin.id, { dryRun });

    console.log('\n========================================');
    console.log('✅ Backfill Complete');
    console.log('========================================');
    console.log('Processed:', stats.processed);
    console.log('Created:', stats.created);
    console.log('Skipped:', stats.skipped);
    console.log('Errors:', stats.errors);
    console.log('');

    if (dryRun) {
      console.log('ℹ️  This was a DRY RUN. Run without --dry-run to apply changes.');
    } else {
      console.log('✅ Finance entries have been created.');
    }

  } catch (error) {
    console.error('\n❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
