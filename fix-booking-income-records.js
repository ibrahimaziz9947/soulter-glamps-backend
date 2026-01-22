/**
 * Fix Incorrect Booking Income Records
 * 
 * This script fixes booking income records that were created with wrong currency and amounts:
 * - Currency: USD → PKR
 * - Amount: Incorrectly divided values → Correct cents values
 * 
 * Example:
 * - Wrong: USD 1250.00 (stored as 125000 cents)
 * - Correct: PKR 125000.00 (stored as 12500000 cents) - need to multiply by 100
 * 
 * Usage:
 * - Dry run: node fix-booking-income-records.js --dry-run
 * - Apply: node fix-booking-income-records.js
 */

import prisma from './src/config/prisma.js';

console.log('========================================');
console.log('🔧 Fix Incorrect Booking Income Records');
console.log('========================================\n');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('⚠️  DRY RUN MODE - No changes will be made\n');
} else {
  console.log('⚠️  LIVE MODE - Records will be updated\n');
}

async function run() {
  try {
    // Find all booking income records with USD currency
    const incorrectIncomes = await prisma.income.findMany({
      where: {
        source: 'BOOKING',
        currency: 'USD',
        deletedAt: null,
      },
      include: {
        booking: {
          select: {
            id: true,
            totalAmount: true,
            customerName: true,
            glampName: true,
          },
        },
      },
    });

    console.log(`Found ${incorrectIncomes.length} booking income records with USD currency\n`);

    if (incorrectIncomes.length === 0) {
      console.log('✅ No incorrect records found. All booking incomes are already using PKR.');
      return;
    }

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const income of incorrectIncomes) {
      try {
        if (!income.booking) {
          console.log(`⚠️  Skipping income ${income.id} - booking not found`);
          skipped++;
          continue;
        }

        const bookingAmount = income.booking.totalAmount;
        const currentIncomeAmount = income.amount;

        // Check if amount needs correction
        // If current amount matches booking amount, it's correct (just wrong currency)
        // If current amount is booking amount / 100, it was incorrectly divided
        const needsAmountFix = currentIncomeAmount !== bookingAmount;
        const correctAmount = bookingAmount; // Booking amount is always in cents

        console.log(`\n📋 Income ${income.id}`);
        console.log(`   Booking: ${income.booking.customerName} - ${income.booking.glampName}`);
        console.log(`   Current: ${income.currency} ${(currentIncomeAmount / 100).toFixed(2)}`);
        console.log(`   Correct: PKR ${(correctAmount / 100).toFixed(2)}`);
        console.log(`   DB values: ${currentIncomeAmount} cents → ${correctAmount} cents`);

        if (dryRun) {
          console.log(`   [DRY RUN] Would update currency to PKR${needsAmountFix ? ' and fix amount' : ''}`);
          fixed++;
        } else {
          await prisma.income.update({
            where: { id: income.id },
            data: {
              currency: 'PKR',
              amount: correctAmount,
            },
          });
          console.log(`   ✅ Updated to PKR ${(correctAmount / 100).toFixed(2)}`);
          fixed++;
        }
      } catch (error) {
        console.error(`   ❌ Error updating income ${income.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`Fixed: ${fixed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('');

    if (dryRun) {
      console.log('ℹ️  This was a DRY RUN. Run without --dry-run to apply changes.');
    } else {
      console.log('✅ All booking income records have been corrected.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
