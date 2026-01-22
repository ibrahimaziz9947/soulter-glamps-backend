/**
 * Diagnostic script to check Super Admin Dashboard Finance Snapshot issue
 * This script will:
 * 1. Check if we have any Income, Expense, Purchase records in the database
 * 2. Test the P&L service directly with various date ranges
 * 3. Test the dashboard service to see what it returns
 * 
 * Usage: node diagnose-dashboard-finance.js
 */

import prisma from './src/config/prisma.js';
import { computeProfitAndLoss } from './src/modules/finance/profitLoss/profitLoss.service.js';
import { getDashboardSummary } from './src/modules/super-admin/dashboard/super-admin-dashboard.service.js';

console.log('========================================');
console.log('🔍 Dashboard Finance Snapshot Diagnostic');
console.log('========================================\n');

// ============================================
// Step 1: Check database for records
// ============================================
async function checkDatabaseRecords() {
  console.log('📊 STEP 1: Checking database records...\n');

  // Count Income records
  const incomeCount = await prisma.income.count({
    where: { deletedAt: null },
  });
  
  const incomeByStatus = await prisma.income.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: { id: true },
    _sum: { amount: true },
  });

  console.log(`Income records: ${incomeCount}`);
  console.log('Income by status:');
  incomeByStatus.forEach(item => {
    console.log(`  - ${item.status}: ${item._count.id} records, ${item._sum.amount || 0} cents`);
  });

  // Count Expense records
  const expenseCount = await prisma.expense.count({
    where: { deletedAt: null },
  });
  
  const expenseByStatus = await prisma.expense.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: { id: true },
    _sum: { amount: true },
  });

  console.log(`\nExpense records: ${expenseCount}`);
  console.log('Expense by status:');
  expenseByStatus.forEach(item => {
    console.log(`  - ${item.status}: ${item._count.id} records, ${item._sum.amount || 0} cents`);
  });

  // Count Purchase records
  const purchaseCount = await prisma.purchase.count({
    where: { deletedAt: null },
  });
  
  const purchaseByStatus = await prisma.purchase.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: { id: true },
    _sum: { amount: true },
  });

  console.log(`\nPurchase records: ${purchaseCount}`);
  console.log('Purchase by status:');
  purchaseByStatus.forEach(item => {
    console.log(`  - ${item.status}: ${item._count.id} records, ${item._sum.amount || 0} cents`);
  });

  // Sample some records
  if (incomeCount > 0) {
    const sampleIncome = await prisma.income.findMany({
      where: { deletedAt: null },
      take: 2,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        dateReceived: true,
        source: true,
      },
    });
    console.log('\nSample Income records:');
    console.log(JSON.stringify(sampleIncome, null, 2));
  }

  if (expenseCount > 0) {
    const sampleExpense = await prisma.expense.findMany({
      where: { deletedAt: null },
      take: 2,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        date: true,
        title: true,
      },
    });
    console.log('\nSample Expense records:');
    console.log(JSON.stringify(sampleExpense, null, 2));
  }

  console.log('\n');
}

// ============================================
// Step 2: Test P&L Service directly
// ============================================
async function testPLService() {
  console.log('📊 STEP 2: Testing P&L Service directly...\n');

  // Test 1: No date filters (all time)
  console.log('Test 2a: P&L with NO date filters (all time)');
  try {
    const plAllTime = await computeProfitAndLoss({
      includeBreakdown: false,
      expenseMode: 'approvedOnly',
    });
    console.log('Result:');
    console.log(JSON.stringify(plAllTime.summary, null, 2));
    console.log('Debug counts:', plAllTime.debugCounts);
  } catch (error) {
    console.error('ERROR:', error.message);
  }

  console.log('\n');

  // Test 2: With date range (last 30 days)
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);

  console.log('Test 2b: P&L with date filters (last 30 days)');
  console.log(`  from: ${from.toISOString()}`);
  console.log(`  to: ${to.toISOString()}`);
  
  try {
    const plLast30 = await computeProfitAndLoss({
      from: from.toISOString(),
      to: to.toISOString(),
      includeBreakdown: false,
      expenseMode: 'approvedOnly',
    });
    console.log('Result:');
    console.log(JSON.stringify(plLast30.summary, null, 2));
    console.log('Debug counts:', plLast30.debugCounts);
  } catch (error) {
    console.error('ERROR:', error.message);
  }

  console.log('\n');

  // Test 3: Specific date range
  console.log('Test 2c: P&L with specific date range (Jan 1-22, 2026)');
  console.log('  from: 2026-01-01T00:00:00.000Z');
  console.log('  to: 2026-01-22T23:59:59.999Z');
  
  try {
    const plJan = await computeProfitAndLoss({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-22T23:59:59.999Z',
      includeBreakdown: false,
      expenseMode: 'approvedOnly',
    });
    console.log('Result:');
    console.log(JSON.stringify(plJan.summary, null, 2));
    console.log('Debug counts:', plJan.debugCounts);
  } catch (error) {
    console.error('ERROR:', error.message);
  }

  console.log('\n');
}

// ============================================
// Step 3: Test Dashboard Service
// ============================================
async function testDashboardService() {
  console.log('📊 STEP 3: Testing Dashboard Service...\n');

  // Test with last 30 days
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);

  console.log('Test 3: Dashboard Summary (last 30 days)');
  console.log(`  from: ${from.toISOString()}`);
  console.log(`  to: ${to.toISOString()}`);

  try {
    const dashboard = await getDashboardSummary({
      from: from,
      to: to,
    });
    
    console.log('\nDashboard Result:');
    console.log(JSON.stringify(dashboard, null, 2));
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }

  console.log('\n');
}

// ============================================
// Run all diagnostics
// ============================================
async function runDiagnostics() {
  try {
    await checkDatabaseRecords();
    await testPLService();
    await testDashboardService();

    console.log('========================================');
    console.log('✅ Diagnostics complete');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Diagnostics failed:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostics();
