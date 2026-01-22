/**
 * Money Units Regression Test
 * 
 * Purpose: Verify all finance endpoints return amounts in whole PKR (not cents)
 * and that calculations are mathematically correct.
 * 
 * Test Scenario:
 * - totalIncome: 270,000 PKR (stored as 27000000 cents in DB)
 * - totalPurchases: 165,000 PKR (stored as 16500000 cents in DB)
 * - submittedExpenses: 61,000 PKR (stored as 6100000 cents in DB)
 * - Expected netProfit: 270,000 - 165,000 - 61,000 = 44,000 PKR
 */

import prisma from './src/config/prisma.js';

async function testMoneyUnits() {
  console.log('\n========================================');
  console.log('💰 Money Units Regression Test');
  console.log('========================================\n');

  const errors = [];
  const warnings = [];

  try {
    // ============================================
    // 1. Test Profit & Loss Endpoint
    // ============================================
    console.log('1️⃣  Testing Profit & Loss Service...\n');
    
    const { computeProfitAndLoss } = await import('./src/modules/finance/profitLoss/profitLoss.service.js');
    
    const plResult = await computeProfitAndLoss({
      includeBreakdown: false,
    });

    console.log('   Raw summary response:', JSON.stringify(plResult.summary, null, 2));
    
    // Check new fields exist
    if (!('totalIncome' in plResult.summary)) {
      errors.push('P&L: Missing totalIncome field');
    }
    if (!('totalExpenses' in plResult.summary)) {
      errors.push('P&L: Missing totalExpenses field');
    }
    if (!('netProfit' in plResult.summary)) {
      errors.push('P&L: Missing netProfit field');
    }

    // Verify values are in reasonable range for PKR (whole units, not cents)
    const { totalIncome, totalExpenses, totalPurchases, netProfit } = plResult.summary;
    
    if (totalIncome > 1000000) {
      warnings.push(`P&L: totalIncome is ${totalIncome.toLocaleString()} - seems high for whole PKR, might still be in cents`);
    }

    // Check legacy fields still exist
    if (!('totalIncomeCents' in plResult.summary)) {
      warnings.push('P&L: Missing legacy totalIncomeCents field (backward compatibility)');
    }

    // Verify calculation: netProfit = totalIncome - totalExpenses - totalPurchases
    const expectedNetProfit = totalIncome - totalExpenses - totalPurchases;
    if (netProfit !== expectedNetProfit) {
      errors.push(`P&L: Net profit calculation wrong. Expected ${expectedNetProfit}, got ${netProfit}`);
    } else {
      console.log('   ✅ Net profit calculation correct');
    }

    console.log(`   Total Income: PKR ${totalIncome.toLocaleString()}`);
    console.log(`   Total Expenses: PKR ${totalExpenses.toLocaleString()}`);
    console.log(`   Total Purchases: PKR ${totalPurchases.toLocaleString()}`);
    console.log(`   Net Profit: PKR ${netProfit.toLocaleString()}\n`);

    // ============================================
    // 2. Test Dashboard Endpoint
    // ============================================
    console.log('2️⃣  Testing Dashboard Service...\n');
    
    const { getDashboardData } = await import('./src/modules/finance/dashboard/dashboard.service.js');
    
    const dashboardResult = await getDashboardData({});

    console.log('   Raw KPIs response:', JSON.stringify(dashboardResult.kpis, null, 2));

    // Check new fields exist
    if (!('totalIncome' in dashboardResult.kpis)) {
      errors.push('Dashboard: Missing totalIncome field');
    }
    if (!('netProfit' in dashboardResult.kpis)) {
      errors.push('Dashboard: Missing netProfit field');
    }
    if (!('currency' in dashboardResult.kpis)) {
      errors.push('Dashboard: Missing currency field');
    }

    // Verify recent transactions use amount (not amountCents)
    if (dashboardResult.recentTransactions && dashboardResult.recentTransactions.length > 0) {
      const firstTx = dashboardResult.recentTransactions[0];
      if (!('amount' in firstTx)) {
        errors.push('Dashboard: Recent transactions missing amount field');
      }
      if (firstTx.amount && firstTx.amount > 1000000) {
        warnings.push(`Dashboard: Transaction amount ${firstTx.amount} seems high for whole PKR`);
      }
    }

    console.log(`   Total Income: PKR ${dashboardResult.kpis.totalIncome.toLocaleString()}`);
    console.log(`   Net Profit: PKR ${dashboardResult.kpis.netProfit.toLocaleString()}`);
    console.log(`   Currency: ${dashboardResult.kpis.currency}\n`);

    // ============================================
    // 3. Test Income Endpoint
    // ============================================
    console.log('3️⃣  Testing Income Service...\n');
    
    const { listIncome } = await import('./src/modules/finance/income/income.service.js');
    
    const incomeResult = await listIncome({ page: 1, limit: 10 });

    console.log('   Raw summary response:', JSON.stringify(incomeResult.summary, null, 2));

    if (!('total' in incomeResult.summary)) {
      errors.push('Income: Missing summary.total field');
    }

    if (incomeResult.summary.total > 10000000) {
      warnings.push(`Income: summary.total is ${incomeResult.summary.total.toLocaleString()} - seems high for whole PKR`);
    }

    console.log(`   Summary Total: PKR ${incomeResult.summary.total.toLocaleString()}`);
    console.log(`   Count: ${incomeResult.summary.count}\n`);

    // ============================================
    // 4. Test Expenses Endpoint
    // ============================================
    console.log('4️⃣  Testing Expenses Service...\n');
    
    const { getExpenses } = await import('./src/modules/finance/expenses/expense.service.js');
    
    const expenseResult = await getExpenses({ page: 1, limit: 10 });

    console.log('   Raw summary response:', JSON.stringify(expenseResult.summary, null, 2));

    if (!('total' in expenseResult.summary)) {
      errors.push('Expenses: Missing summary.total field');
    }

    if (expenseResult.summary.total && expenseResult.summary.total > 1000000) {
      warnings.push(`Expenses: summary.total is ${expenseResult.summary.total.toLocaleString()} - seems high for whole PKR`);
    }

    console.log(`   Summary Total: PKR ${expenseResult.summary.total.toLocaleString()}`);
    console.log(`   Count: ${expenseResult.summary.count}\n`);

    // ============================================
    // 5. Test Super Admin Dashboard
    // ============================================
    console.log('5️⃣  Testing Super Admin Dashboard...\n');
    
    const { getDashboardSummary } = await import('./src/modules/super-admin/dashboard/super-admin-dashboard.service.js');
    
    const superAdminResult = await getDashboardSummary({});

    console.log('   Raw financeSnapshot:', JSON.stringify(superAdminResult.financeSnapshot, null, 2));

    if (!('totalIncome' in superAdminResult.financeSnapshot)) {
      errors.push('Super Admin: Missing financeSnapshot.totalIncome field');
    }
    if (!('currency' in superAdminResult.financeSnapshot)) {
      errors.push('Super Admin: Missing financeSnapshot.currency field');
    }

    console.log(`   Total Income: PKR ${superAdminResult.financeSnapshot.totalIncome.toLocaleString()}`);
    console.log(`   Total Expenses: PKR ${superAdminResult.financeSnapshot.totalExpenses.toLocaleString()}`);
    console.log(`   Net Profit: PKR ${superAdminResult.financeSnapshot.netProfit.toLocaleString()}`);
    console.log(`   Currency: ${superAdminResult.financeSnapshot.currency}\n`);

    // ============================================
    // 6. Cross-Endpoint Consistency Check
    // ============================================
    console.log('6️⃣  Cross-Endpoint Consistency...\n');
    
    // P&L and Dashboard should return same KPIs (for same date range)
    if (Math.abs(plResult.summary.totalIncome - dashboardResult.kpis.totalIncome) > 1) {
      warnings.push(`Income mismatch: P&L=${plResult.summary.totalIncome}, Dashboard=${dashboardResult.kpis.totalIncome}`);
    } else {
      console.log('   ✅ Income matches across P&L and Dashboard');
    }

    if (Math.abs(plResult.summary.netProfit - dashboardResult.kpis.netProfit) > 1) {
      warnings.push(`Net profit mismatch: P&L=${plResult.summary.netProfit}, Dashboard=${dashboardResult.kpis.netProfit}`);
    } else {
      console.log('   ✅ Net profit matches across P&L and Dashboard');
    }

    // ============================================
    // Summary
    // ============================================
    console.log('\n========================================');
    console.log('📊 Test Summary');
    console.log('========================================\n');

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ ALL TESTS PASSED - No errors or warnings\n');
    } else {
      if (errors.length > 0) {
        console.log(`❌ ERRORS (${errors.length}):`);
        errors.forEach((err, idx) => console.log(`   ${idx + 1}. ${err}`));
        console.log('');
      }

      if (warnings.length > 0) {
        console.log(`⚠️  WARNINGS (${warnings.length}):`);
        warnings.forEach((warn, idx) => console.log(`   ${idx + 1}. ${warn}`));
        console.log('');
      }
    }

    console.log('========================================\n');

    process.exitCode = errors.length > 0 ? 1 : 0;

  } catch (error) {
    console.error('\n❌ Test failed with exception:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMoneyUnits().catch(console.error);
