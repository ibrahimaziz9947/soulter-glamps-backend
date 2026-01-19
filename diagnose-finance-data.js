/**
 * Diagnostic: Check Finance Data
 * 
 * This script checks if there's actual financial data in the database
 * and what the profit/loss service returns.
 */

import prisma from './src/config/prisma.js';
import { computeProfitAndLoss } from './src/modules/finance/profitLoss/profitLoss.service.js';

async function diagnoseFinanceData() {
  console.log('\n🔍 Finance Data Diagnostic');
  console.log('='.repeat(60));

  try {
    // Check Income data
    console.log('\n📊 INCOME DATA:');
    const incomeByStatus = await prisma.income.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
      _sum: { amount: true },
    });

    console.log('  Income by Status:');
    incomeByStatus.forEach(item => {
      console.log(`    ${item.status}: ${item._count.id} records, ${item._sum.amount || 0} cents total`);
    });

    const totalIncome = await prisma.income.aggregate({
      where: { 
        deletedAt: null,
        status: { in: ['DRAFT', 'CONFIRMED'] }
      },
      _sum: { amount: true },
      _count: { id: true },
    });
    console.log(`  Total Income (DRAFT+CONFIRMED): ${totalIncome._count.id} records, ${totalIncome._sum.amount || 0} cents`);

    // Check Expense data
    console.log('\n💰 EXPENSE DATA:');
    const expenseByStatus = await prisma.expense.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
      _sum: { amount: true },
    });

    console.log('  Expenses by Status:');
    expenseByStatus.forEach(item => {
      console.log(`    ${item.status}: ${item._count.id} records, ${item._sum.amount || 0} cents total`);
    });

    const totalExpenses = await prisma.expense.aggregate({
      where: { 
        deletedAt: null,
        status: 'APPROVED'
      },
      _sum: { amount: true },
      _count: { id: true },
    });
    console.log(`  Total Expenses (APPROVED): ${totalExpenses._count.id} records, ${totalExpenses._sum.amount || 0} cents`);

    // Check Purchase data
    console.log('\n🛒 PURCHASE DATA:');
    const purchaseByStatus = await prisma.purchase.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
      _sum: { amount: true },
    });

    console.log('  Purchases by Status:');
    purchaseByStatus.forEach(item => {
      console.log(`    ${item.status}: ${item._count.id} records, ${item._sum.amount || 0} cents total`);
    });

    const totalPurchases = await prisma.purchase.aggregate({
      where: { 
        deletedAt: null,
        status: { in: ['CONFIRMED'] }
      },
      _sum: { amount: true },
      _count: { id: true },
    });
    console.log(`  Total Purchases (CONFIRMED): ${totalPurchases._count.id} records, ${totalPurchases._sum.amount || 0} cents`);

    // Test P&L service (last 30 days)
    console.log('\n📈 PROFIT & LOSS SERVICE TEST:');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const plResult = await computeProfitAndLoss({
      from: thirtyDaysAgo.toISOString(),
      to: new Date().toISOString(),
      includeBreakdown: false,
      expenseMode: 'approvedOnly',
    });

    console.log('  P&L Results (last 30 days):');
    console.log(`    Total Income: ${plResult.totalIncomeCents || 0} cents`);
    console.log(`    Total Expenses: ${plResult.totalExpensesCents || 0} cents`);
    console.log(`    Total Purchases: ${plResult.totalPurchasesCents || 0} cents`);
    console.log(`    Net Profit: ${plResult.netProfitCents || 0} cents`);

    // Test with all-time
    console.log('\n📈 PROFIT & LOSS SERVICE TEST (ALL TIME):');
    const plAllTime = await computeProfitAndLoss({
      includeBreakdown: false,
      expenseMode: 'approvedOnly',
    });

    console.log('  P&L Results (all time):');
    console.log(`    Total Income: ${plAllTime.totalIncomeCents || 0} cents`);
    console.log(`    Total Expenses: ${plAllTime.totalExpensesCents || 0} cents`);
    console.log(`    Total Purchases: ${plAllTime.totalPurchasesCents || 0} cents`);
    console.log(`    Net Profit: ${plAllTime.netProfitCents || 0} cents`);

    // Sample data
    console.log('\n📄 SAMPLE DATA:');
    const sampleIncome = await prisma.income.findFirst({
      where: { deletedAt: null, status: 'CONFIRMED' },
      select: { id: true, amount: true, status: true, dateReceived: true, source: true }
    });
    if (sampleIncome) {
      console.log('  Sample Income:', sampleIncome);
    } else {
      console.log('  No CONFIRMED income found');
    }

    const sampleExpense = await prisma.expense.findFirst({
      where: { deletedAt: null, status: 'APPROVED' },
      select: { id: true, amount: true, status: true, date: true, title: true }
    });
    if (sampleExpense) {
      console.log('  Sample Expense:', sampleExpense);
    } else {
      console.log('  No APPROVED expenses found');
    }

    const samplePurchase = await prisma.purchase.findFirst({
      where: { deletedAt: null, status: 'CONFIRMED' },
      select: { id: true, amount: true, status: true, purchaseDate: true, vendorName: true }
    });
    if (samplePurchase) {
      console.log('  Sample Purchase:', samplePurchase);
    } else {
      console.log('  No CONFIRMED purchases found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostic complete');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseFinanceData();
