/**
 * Diagnose Money Units - Determine if DB stores cents or whole currency units
 */

import prisma from './src/config/prisma.js';

async function diagnose() {
  console.log('\n========================================');
  console.log('💰 Money Units Diagnostic');
  console.log('========================================\n');

  // Sample booking
  const booking = await prisma.booking.findFirst({
    select: { customerName: true, totalAmount: true, glampName: true },
  });

  console.log('📦 Sample Booking:');
  console.log(`   Customer: ${booking.customerName}`);
  console.log(`   Glamp: ${booking.glampName || 'Unknown'}`);
  console.log(`   DB totalAmount: ${booking.totalAmount}`);
  console.log(`   If cents: PKR ${(booking.totalAmount / 100).toFixed(2)}`);
  console.log(`   If whole PKR: PKR ${booking.totalAmount.toLocaleString()}`);

  // Sample income
  const income = await prisma.income.findFirst({
    where: { deletedAt: null },
    select: { amount: true, currency: true, source: true, reference: true },
  });

  console.log('\n💵 Sample Income:');
  console.log(`   Source: ${income.source}`);
  console.log(`   Currency: ${income.currency}`);
  console.log(`   DB amount: ${income.amount}`);
  console.log(`   If cents: ${income.currency} ${(income.amount / 100).toFixed(2)}`);
  console.log(`   If whole ${income.currency}: ${income.currency} ${income.amount.toLocaleString()}`);

  // Sample expense
  const expense = await prisma.expense.findFirst({
    where: { deletedAt: null },
    select: { title: true, amount: true, vendor: true },
  });

  console.log('\n📊 Sample Expense:');
  console.log(`   Title: ${expense.title}`);
  console.log(`   Vendor: ${expense.vendor || 'N/A'}`);
  console.log(`   DB amount: ${expense.amount}`);
  console.log(`   If cents: PKR ${(expense.amount / 100).toFixed(2)}`);
  console.log(`   If whole PKR: PKR ${expense.amount.toLocaleString()}`);

  // Sample purchase
  const purchase = await prisma.purchase.findFirst({
    where: { deletedAt: null },
    select: { vendorName: true, amount: true, paidAmountCents: true, currency: true },
  });

  console.log('\n🛒 Sample Purchase:');
  console.log(`   Vendor: ${purchase.vendorName}`);
  console.log(`   Currency: ${purchase.currency}`);
  console.log(`   DB amount: ${purchase.amount}`);
  console.log(`   DB paidAmountCents: ${purchase.paidAmountCents}`);
  console.log(`   If amount is cents: ${purchase.currency} ${(purchase.amount / 100).toFixed(2)}`);
  console.log(`   If amount is whole ${purchase.currency}: ${purchase.currency} ${purchase.amount.toLocaleString()}`);
  console.log(`   If paidAmountCents is cents: ${purchase.currency} ${(purchase.paidAmountCents / 100).toFixed(2)} paid`);

  console.log('\n========================================');
  console.log('🔍 Analysis:');
  console.log('========================================');
  console.log('Based on the values above, determine:');
  console.log('1. Do the "If cents" interpretations make sense for typical Pakistani glamp bookings?');
  console.log('2. Or do the "If whole PKR" interpretations make more sense?');
  console.log('\nTypical glamp booking range: PKR 10,000 - 100,000');
  console.log('Typical expense range: PKR 5,000 - 50,000');
  console.log('========================================\n');

  await prisma.$disconnect();
}

diagnose().catch(console.error);
