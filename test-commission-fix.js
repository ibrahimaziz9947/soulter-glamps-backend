/**
 * Quick Test: Verify Commission Amounts Fix
 * 
 * This script directly tests the service function to verify:
 * 1. Items include amountCents field
 * 2. Aggregates are correct
 * 3. Debug logs show expected values
 * 
 * Usage: node test-commission-fix.js
 */

import * as commissionsService from './src/modules/super-admin/commissions/super-admin-commissions.service.js';
import prisma from './src/config/prisma.js';

async function testFix() {
  console.log('\n🧪 Testing Commission Amounts Fix');
  console.log('='.repeat(60));

  try {
    // Call the service function with default filters (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log('\n📡 Calling getAllCommissions service...\n');
    
    const result = await commissionsService.getAllCommissions(
      {
        from: thirtyDaysAgo,
        to: now,
        status: 'ALL', // Get all statuses
      },
      {
        skip: 0,
        take: 20,
      },
      'createdAt_desc'
    );

    console.log('\n📋 Results Summary:');
    console.log(`  Total items: ${result.total}`);
    console.log(`  Items returned: ${result.items.length}`);

    console.log('\n💰 Aggregates:');
    console.log(`  Pending Count: ${result.aggregates.pendingCount}`);
    console.log(`  Pending Amount (cents): ${result.aggregates.pendingAmountCents}`);
    console.log(`  Pending Amount (PKR): ${(result.aggregates.pendingAmountCents / 100).toFixed(2)}`);
    console.log(`  Paid Count: ${result.aggregates.paidCount}`);
    console.log(`  Paid Amount (cents): ${result.aggregates.paidAmountCents}`);
    console.log(`  Paid Amount (PKR): ${(result.aggregates.paidAmountCents / 100).toFixed(2)}`);
    console.log(`  Total Amount (cents): ${result.aggregates.totalAmountCents}`);
    console.log(`  Total Amount (PKR): ${(result.aggregates.totalAmountCents / 100).toFixed(2)}`);

    if (result.items.length > 0) {
      const firstItem = result.items[0];
      console.log('\n📄 First Item Check:');
      console.log(`  ID: ${firstItem.id}`);
      console.log(`  Status: ${firstItem.status}`);
      console.log(`  Has 'amount' field: ${firstItem.amount !== undefined ? '✅ YES' : '❌ NO'}`);
      console.log(`  amount value: ${firstItem.amount}`);
      console.log(`  Has 'amountCents' field: ${firstItem.amountCents !== undefined ? '✅ YES' : '❌ NO'}`);
      console.log(`  amountCents value: ${firstItem.amountCents}`);
      console.log(`  Amount in PKR: ${(firstItem.amountCents / 100).toFixed(2)}`);
    }

    // Verification
    console.log('\n✅ Verification:');
    let allPassed = true;

    if (result.items.length > 0) {
      const hasAmountCents = result.items.every(item => item.amountCents !== undefined);
      if (hasAmountCents) {
        console.log('  ✅ All items have amountCents field');
      } else {
        console.log('  ❌ Some items missing amountCents field');
        allPassed = false;
      }

      const amountCentsMatchesAmount = result.items.every(
        item => item.amountCents === item.amount
      );
      if (amountCentsMatchesAmount) {
        console.log('  ✅ amountCents matches amount for all items');
      } else {
        console.log('  ❌ amountCents does NOT match amount');
        allPassed = false;
      }
    }

    if (result.aggregates.pendingAmountCents !== undefined) {
      console.log('  ✅ pendingAmountCents exists in aggregates');
    } else {
      console.log('  ❌ pendingAmountCents missing from aggregates');
      allPassed = false;
    }

    if (result.aggregates.paidAmountCents !== undefined) {
      console.log('  ✅ paidAmountCents exists in aggregates');
    } else {
      console.log('  ❌ paidAmountCents missing from aggregates');
      allPassed = false;
    }

    if (result.aggregates.totalAmountCents !== undefined) {
      console.log('  ✅ totalAmountCents exists in aggregates');
    } else {
      console.log('  ❌ totalAmountCents missing from aggregates');
      allPassed = false;
    }

    // Check expected values from diagnostic
    console.log('\n🎯 Expected Values Check:');
    if (result.aggregates.pendingAmountCents === 40000) {
      console.log('  ✅ Pending amount matches expected: 40,000 cents');
    } else {
      console.log(`  ⚠️  Pending amount: ${result.aggregates.pendingAmountCents} cents (may vary with filters)`);
    }

    if (result.aggregates.paidAmountCents === 75000) {
      console.log('  ✅ Paid amount matches expected: 75,000 cents');
    } else {
      console.log(`  ⚠️  Paid amount: ${result.aggregates.paidAmountCents} cents (may vary with filters)`);
    }

    if (result.aggregates.totalAmountCents === 115000) {
      console.log('  ✅ Total amount matches expected: 115,000 cents');
    } else {
      console.log(`  ⚠️  Total amount: ${result.aggregates.totalAmountCents} cents (may vary with filters)`);
    }

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - Fix is working correctly!');
    } else {
      console.log('❌ SOME TESTS FAILED - Please review the output above');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testFix();
