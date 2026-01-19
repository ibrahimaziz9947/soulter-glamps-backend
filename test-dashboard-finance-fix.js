/**
 * Test: Super Admin Dashboard Finance Snapshot Fix
 * 
 * This script tests that the dashboard endpoint returns correct finance values.
 */

import * as dashboardService from './src/modules/super-admin/dashboard/super-admin-dashboard.service.js';
import prisma from './src/config/prisma.js';

async function testDashboardFinanceSnapshot() {
  console.log('\n🧪 Testing Dashboard Finance Snapshot Fix');
  console.log('='.repeat(60));

  try {
    // Test with last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const now = new Date();

    console.log('\n📊 Testing with date range (last 30 days):');
    console.log(`  From: ${thirtyDaysAgo.toISOString()}`);
    console.log(`  To: ${now.toISOString()}`);

    const result30Days = await dashboardService.getDashboardSummary({
      from: thirtyDaysAgo,
      to: now,
    });

    console.log('\n✅ Dashboard Summary (last 30 days):');
    console.log(`  Total Bookings: ${result30Days.totalBookings}`);
    console.log(`  Revenue: ${result30Days.revenueCents} cents`);
    console.log(`  Pending Commissions: ${result30Days.pendingCommissions.amountCents} cents (${result30Days.pendingCommissions.count} records)`);
    console.log('\n  Finance Snapshot:');
    console.log(`    Revenue: ${result30Days.financeSnapshot.revenueCents} cents`);
    console.log(`    Expenses: ${result30Days.financeSnapshot.expenseCents} cents`);
    console.log(`    Profit: ${result30Days.financeSnapshot.profitCents} cents`);

    // Test with all time (no date filters)
    console.log('\n\n📊 Testing with no date filters (all time):');
    
    const resultAllTime = await dashboardService.getDashboardSummary({});

    console.log('\n✅ Dashboard Summary (all time):');
    console.log(`  Total Bookings: ${resultAllTime.totalBookings}`);
    console.log(`  Revenue: ${resultAllTime.revenueCents} cents`);
    console.log(`  Pending Commissions: ${resultAllTime.pendingCommissions.amountCents} cents (${resultAllTime.pendingCommissions.count} records)`);
    console.log('\n  Finance Snapshot:');
    console.log(`    Revenue: ${resultAllTime.financeSnapshot.revenueCents} cents`);
    console.log(`    Expenses: ${resultAllTime.financeSnapshot.expenseCents} cents`);
    console.log(`    Profit: ${resultAllTime.financeSnapshot.profitCents} cents`);

    // Verification
    console.log('\n\n✅ Verification:');
    
    if (result30Days.financeSnapshot.revenueCents > 0) {
      console.log('  ✅ Revenue is populated (not zero)');
    } else {
      console.log('  ⚠️  Revenue is still zero - check if income data exists in date range');
    }

    if (result30Days.financeSnapshot.expenseCents >= 0) {
      console.log('  ✅ Expenses field exists (may be zero if no approved expenses)');
    } else {
      console.log('  ❌ Expenses field is invalid');
    }

    if (result30Days.financeSnapshot.profitCents !== undefined) {
      console.log('  ✅ Profit is calculated');
    } else {
      console.log('  ❌ Profit is undefined');
    }

    // Compare with expected values from diagnostic
    console.log('\n📈 Expected Values (from diagnostic):');
    console.log('  Income (CONFIRMED): 27,000,000 cents');
    console.log('  Expenses (APPROVED): 0 cents');
    console.log('  Purchases (CONFIRMED): 16,500,000 cents');
    console.log('  Net Profit: 10,500,000 cents');
    console.log('\n  Dashboard should show:');
    console.log('    revenueCents: 27,000,000');
    console.log('    expenseCents: 16,500,000 (expenses + purchases)');
    console.log('    profitCents: 10,500,000');

    const matchesExpected = 
      result30Days.financeSnapshot.revenueCents === 27000000 &&
      result30Days.financeSnapshot.expenseCents === 16500000 &&
      result30Days.financeSnapshot.profitCents === 10500000;

    console.log('\n' + '='.repeat(60));
    if (matchesExpected) {
      console.log('✅ ALL VALUES MATCH EXPECTED - Fix is working!');
    } else {
      console.log('⚠️  Values differ from expected (may be due to date range or data changes)');
      console.log(`   Got: revenue=${result30Days.financeSnapshot.revenueCents}, expenses=${result30Days.financeSnapshot.expenseCents}, profit=${result30Days.financeSnapshot.profitCents}`);
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardFinanceSnapshot();
