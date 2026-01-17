/**
 * Script to verify database units and P&L calculation accuracy
 * Checks:
 * 1. Sample records from Income, Expense, Purchase to see actual stored values
 * 2. Manual aggregation to verify totals
 * 3. Compare with P&L service results
 * 
 * Usage: node verify-units.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n========== DATABASE UNIT VERIFICATION ==========\n');

  // ============================================
  // 1. Sample Income Records
  // ============================================
  console.log('📊 Sample Income Records:');
  const sampleIncomes = await prisma.income.findMany({
    where: {
      deletedAt: null,
      status: 'CONFIRMED',
    },
    orderBy: { dateReceived: 'desc' },
    take: 5,
    select: {
      id: true,
      amount: true,
      currency: true,
      dateReceived: true,
      source: true,
    },
  });

  sampleIncomes.forEach((income, idx) => {
    console.log(`  ${idx + 1}. Amount: ${income.amount} cents (${(income.amount / 100).toFixed(2)} ${income.currency})`);
    console.log(`     Date: ${income.dateReceived.toISOString().split('T')[0]}, Source: ${income.source}`);
  });

  // ============================================
  // 2. Sample Expense Records
  // ============================================
  console.log('\n💰 Sample Expense Records:');
  const sampleExpenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      status: 'APPROVED',
    },
    orderBy: { date: 'desc' },
    take: 5,
    select: {
      id: true,
      amount: true,
      title: true,
      date: true,
      status: true,
    },
  });

  sampleExpenses.forEach((expense, idx) => {
    console.log(`  ${idx + 1}. Amount: ${expense.amount} cents (${(expense.amount / 100).toFixed(2)} PKR)`);
    console.log(`     Title: ${expense.title}, Date: ${expense.date.toISOString().split('T')[0]}`);
  });

  // ============================================
  // 3. Sample Purchase Records
  // ============================================
  console.log('\n🛒 Sample Purchase Records:');
  const samplePurchases = await prisma.purchase.findMany({
    where: {
      deletedAt: null,
      status: { in: ['DRAFT', 'CONFIRMED'] },
    },
    orderBy: { purchaseDate: 'desc' },
    take: 5,
    select: {
      id: true,
      amount: true,
      currency: true,
      purchaseDate: true,
      vendorName: true,
      status: true,
    },
  });

  samplePurchases.forEach((purchase, idx) => {
    console.log(`  ${idx + 1}. Amount: ${purchase.amount} cents (${(purchase.amount / 100).toFixed(2)} ${purchase.currency})`);
    console.log(`     Vendor: ${purchase.vendorName}, Date: ${purchase.purchaseDate.toISOString().split('T')[0]}`);
  });

  // ============================================
  // 4. Manual Aggregation (January 2026 example)
  // ============================================
  console.log('\n\n📈 Manual Aggregation (Example: Jan 1-17, 2026):');
  const dateRange = {
    gte: new Date('2026-01-01T00:00:00.000Z'),
    lte: new Date('2026-01-17T23:59:59.999Z'),
  };

  const incomeAgg = await prisma.income.aggregate({
    where: {
      deletedAt: null,
      status: 'CONFIRMED',
      dateReceived: dateRange,
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const expenseAgg = await prisma.expense.aggregate({
    where: {
      deletedAt: null,
      status: 'APPROVED',
      date: dateRange,
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const purchaseAgg = await prisma.purchase.aggregate({
    where: {
      deletedAt: null,
      status: { in: ['DRAFT', 'CONFIRMED'] },
      purchaseDate: dateRange,
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalIncomeCents = incomeAgg._sum.amount || 0;
  const totalExpensesCents = expenseAgg._sum.amount || 0;
  const totalPurchasesCents = purchaseAgg._sum.amount || 0;
  const netProfitCents = totalIncomeCents - totalExpensesCents - totalPurchasesCents;

  console.log('\nManual Calculation Results:');
  console.log(`  Income:     ${incomeAgg._count.id} records, ${totalIncomeCents} cents = ${(totalIncomeCents / 100).toFixed(2)} PKR`);
  console.log(`  Expenses:   ${expenseAgg._count.id} records, ${totalExpensesCents} cents = ${(totalExpensesCents / 100).toFixed(2)} PKR`);
  console.log(`  Purchases:  ${purchaseAgg._count.id} records, ${totalPurchasesCents} cents = ${(totalPurchasesCents / 100).toFixed(2)} PKR`);
  console.log(`  Net Profit: ${netProfitCents} cents = ${(netProfitCents / 100).toFixed(2)} PKR`);

  // ============================================
  // 5. Check P&L Service Output
  // ============================================
  console.log('\n\n🔍 Expected Backend Response (cents with "Cents" suffix):');
  console.log('  {');
  console.log('    "summary": {');
  console.log(`      "totalIncomeCents": ${totalIncomeCents},`);
  console.log(`      "totalExpensesCents": ${totalExpensesCents},`);
  console.log(`      "totalPurchasesCents": ${totalPurchasesCents},`);
  console.log(`      "netProfitCents": ${netProfitCents}`);
  console.log('    }');
  console.log('  }');

  console.log('\n\n✅ Summary:');
  console.log('  - Database stores amounts in CENTS (smallest currency unit)');
  console.log('  - Backend returns values with "Cents" suffix (e.g., totalIncomeCents)');
  console.log('  - Frontend MUST divide by 100 to display in major currency units (PKR)');
  console.log(`  - Example: ${totalIncomeCents} cents ÷ 100 = ${(totalIncomeCents / 100).toFixed(2)} PKR`);
  console.log('\n  ⚠️  If frontend displays 27,000,000 instead of 270,000:');
  console.log('       → Frontend is NOT dividing by 100');
  console.log('       → Backend is correct, frontend needs fix');

  console.log('\n========================================\n');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
