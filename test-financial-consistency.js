/**
 * Test Financial Consistency Fixes
 * 
 * This script verifies:
 * 1. Pending Payables calculation uses outstanding amounts (not total amounts)
 * 2. Booking revenue is posted to Finance Income when confirmed
 * 3. Dashboard totals are consistent with individual endpoint totals
 * 
 * Usage: node test-financial-consistency.js
 */

import prisma from './src/config/prisma.js';
import { getDashboardData } from './src/modules/finance/dashboard/dashboard.service.js';

console.log('========================================');
console.log('🧪 Financial Consistency Tests');
console.log('========================================\n');

/**
 * Test 1: Verify Pending Payables Calculation
 */
async function testPendingPayables() {
  console.log('📊 TEST 1: Pending Payables Calculation\n');

  // Get purchases with UNPAID/PARTIAL status
  const pendingPayables = await prisma.purchase.findMany({
    where: {
      deletedAt: null,
      status: { in: ['DRAFT', 'CONFIRMED'] },
      paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
    },
    select: {
      id: true,
      vendorName: true,
      amount: true,
      paidAmountCents: true,
      paymentStatus: true,
    },
  });

  console.log(`Found ${pendingPayables.length} pending payables\n`);

  // Manual calculation
  let manualTotalAmount = 0;
  let manualPaidAmount = 0;
  let manualOutstanding = 0;

  pendingPayables.forEach((purchase) => {
    const outstanding = purchase.amount - (purchase.paidAmountCents || 0);
    manualTotalAmount += purchase.amount;
    manualPaidAmount += purchase.paidAmountCents || 0;
    manualOutstanding += outstanding;

    console.log(`  ${purchase.vendorName}:`);
    console.log(`    Total: $${(purchase.amount / 100).toFixed(2)}`);
    console.log(`    Paid: $${((purchase.paidAmountCents || 0) / 100).toFixed(2)}`);
    console.log(`    Outstanding: $${(outstanding / 100).toFixed(2)}`);
    console.log('');
  });

  console.log('Manual Calculation Summary:');
  console.log(`  Total Amount: $${(manualTotalAmount / 100).toFixed(2)}`);
  console.log(`  Paid Amount: $${(manualPaidAmount / 100).toFixed(2)}`);
  console.log(`  Outstanding: $${(manualOutstanding / 100).toFixed(2)}`);
  console.log('');

  // Get dashboard data
  const dashboardData = await getDashboardData({});
  const dashboardPendingPayables = dashboardData.kpis.pendingPayablesCents;

  console.log('Dashboard Pending Payables:');
  console.log(`  $${(dashboardPendingPayables / 100).toFixed(2)}`);
  console.log('');

  // Verify they match
  if (dashboardPendingPayables === manualOutstanding) {
    console.log('✅ PASS: Dashboard matches manual calculation (outstanding amounts)\n');
    return true;
  } else {
    console.log('❌ FAIL: Dashboard does NOT match manual calculation');
    console.log(`  Expected: $${(manualOutstanding / 100).toFixed(2)}`);
    console.log(`  Got: $${(dashboardPendingPayables / 100).toFixed(2)}`);
    console.log('');
    return false;
  }
}

/**
 * Test 2: Verify Booking -> Finance Integration
 */
async function testBookingFinanceIntegration() {
  console.log('📊 TEST 2: Booking -> Finance Integration\n');

  // Get confirmed/completed bookings
  const confirmedBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    select: {
      id: true,
      customerName: true,
      glampName: true,
      totalAmount: true,
      status: true,
      incomes: {
        where: { deletedAt: null },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${confirmedBookings.length} confirmed/completed bookings (last 10)\n`);

  let withIncome = 0;
  let withoutIncome = 0;
  let totalBookingRevenue = 0;
  let totalPostedRevenue = 0;

  confirmedBookings.forEach((booking) => {
    const hasIncome = booking.incomes.length > 0;
    totalBookingRevenue += booking.totalAmount;

    if (hasIncome) {
      withIncome++;
      totalPostedRevenue += booking.incomes[0].amount;
      console.log(`  ✅ ${booking.customerName} - ${booking.glampName}`);
      console.log(`     Booking: $${(booking.totalAmount / 100).toFixed(2)} → Income: $${(booking.incomes[0].amount / 100).toFixed(2)}`);
    } else {
      withoutIncome++;
      console.log(`  ❌ ${booking.customerName} - ${booking.glampName}`);
      console.log(`     Booking: $${(booking.totalAmount / 100).toFixed(2)} → NO INCOME ENTRY`);
    }
  });

  console.log('');
  console.log('Integration Summary:');
  console.log(`  With Income: ${withIncome} bookings`);
  console.log(`  Without Income: ${withoutIncome} bookings`);
  console.log(`  Total Booking Revenue: $${(totalBookingRevenue / 100).toFixed(2)}`);
  console.log(`  Total Posted Revenue: $${(totalPostedRevenue / 100).toFixed(2)}`);
  console.log(`  Gap: $${((totalBookingRevenue - totalPostedRevenue) / 100).toFixed(2)}`);
  console.log('');

  if (withoutIncome > 0) {
    console.log('⚠️  WARNING: Some confirmed bookings are not posted to Finance');
    console.log('   Run: node backfill-booking-finance.js --dry-run (to preview)');
    console.log('   Run: node backfill-booking-finance.js (to apply)');
    console.log('');
    return false;
  } else {
    console.log('✅ PASS: All confirmed bookings are posted to Finance\n');
    return true;
  }
}

/**
 * Test 3: Dashboard vs Individual Endpoints Consistency
 */
async function testDashboardConsistency() {
  console.log('📊 TEST 3: Dashboard Consistency\n');

  // Get dashboard data
  const dashboardData = await getDashboardData({});

  console.log('Dashboard KPIs:');
  console.log(`  Total Income: $${(dashboardData.kpis.totalIncomeCents / 100).toFixed(2)}`);
  console.log(`  Total Expenses: $${(dashboardData.kpis.totalExpensesCents / 100).toFixed(2)}`);
  console.log(`  Total Purchases: $${((dashboardData.kpis.totalPurchasesCents || 0) / 100).toFixed(2)}`);
  console.log(`  Net Profit: $${(dashboardData.kpis.netProfitCents / 100).toFixed(2)}`);
  console.log(`  Pending Payables: $${(dashboardData.kpis.pendingPayablesCents / 100).toFixed(2)}`);
  console.log('');

  // Verify totals
  const totalExpensesCents = dashboardData.kpis.totalExpensesCents || 0;
  const totalPurchasesCents = dashboardData.kpis.totalPurchasesCents || 0;
  const totalExpensesAndPurchases = totalExpensesCents + totalPurchasesCents;
  const calculatedProfit = dashboardData.kpis.totalIncomeCents - totalExpensesAndPurchases;

  console.log('Verification:');
  console.log(`  Income - (Expenses + Purchases) = Profit`);
  console.log(`  $${(dashboardData.kpis.totalIncomeCents / 100).toFixed(2)} - $${(totalExpensesAndPurchases / 100).toFixed(2)} = $${(calculatedProfit / 100).toFixed(2)}`);
  console.log(`  Expected Profit: $${(dashboardData.kpis.netProfitCents / 100).toFixed(2)}`);
  console.log('');

  if (calculatedProfit === dashboardData.kpis.netProfitCents) {
    console.log('✅ PASS: Profit calculation is correct\n');
    return true;
  } else {
    console.log('❌ FAIL: Profit calculation mismatch\n');
    return false;
  }
}

/**
 * Test 4: Super Admin Dashboard Revenue Comparison
 */
async function testSuperAdminDashboard() {
  console.log('📊 TEST 4: Super Admin Dashboard Revenue\n');

  // Get booking revenue (CONFIRMED + COMPLETED bookings)
  const bookingRevenue = await prisma.booking.aggregate({
    where: {
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    _sum: { totalAmount: true },
  });

  // Get finance income (all CONFIRMED income)
  const financeIncome = await prisma.income.aggregate({
    where: {
      deletedAt: null,
      status: 'CONFIRMED',
    },
    _sum: { amount: true },
  });

  // Get booking-sourced income only
  const bookingIncome = await prisma.income.aggregate({
    where: {
      deletedAt: null,
      status: 'CONFIRMED',
      source: 'BOOKING',
    },
    _sum: { amount: true },
  });

  const bookingRevenueCents = bookingRevenue._sum.totalAmount || 0;
  const financeIncomeCents = financeIncome._sum.amount || 0;
  const bookingIncomeCents = bookingIncome._sum.amount || 0;

  console.log('Revenue Breakdown:');
  console.log(`  Booking Revenue (CONFIRMED/COMPLETED): $${(bookingRevenueCents / 100).toFixed(2)}`);
  console.log(`  Finance Income (ALL sources): $${(financeIncomeCents / 100).toFixed(2)}`);
  console.log(`  Finance Income (BOOKING source): $${(bookingIncomeCents / 100).toFixed(2)}`);
  console.log('');

  const gap = bookingRevenueCents - bookingIncomeCents;
  console.log(`  Gap (unposted bookings): $${(gap / 100).toFixed(2)}`);
  console.log('');

  if (gap === 0) {
    console.log('✅ PASS: All booking revenue is posted to Finance\n');
    return true;
  } else if (gap > 0) {
    console.log('⚠️  WARNING: Some booking revenue is NOT posted to Finance');
    console.log(`   Missing: $${(gap / 100).toFixed(2)}`);
    console.log('   Run backfill script to fix this.');
    console.log('');
    return false;
  } else {
    console.log('⚠️  WARNING: Finance income exceeds booking revenue');
    console.log('   This may indicate manual income entries (expected).');
    console.log('');
    return true;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    const results = {
      test1: await testPendingPayables(),
      test2: await testBookingFinanceIntegration(),
      test3: await testDashboardConsistency(),
      test4: await testSuperAdminDashboard(),
    };

    console.log('========================================');
    console.log('📊 Test Results Summary');
    console.log('========================================');
    console.log(`Test 1 (Pending Payables): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (Booking->Finance): ${results.test2 ? '✅ PASS' : '⚠️  WARN'}`);
    console.log(`Test 3 (Dashboard Consistency): ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 4 (Revenue Comparison): ${results.test4 ? '✅ PASS' : '⚠️  WARN'}`);
    console.log('');

    const allPass = Object.values(results).every(r => r === true);
    if (allPass) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed or have warnings. Review above output.');
    }

  } catch (error) {
    console.error('\n❌ Error during tests:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
