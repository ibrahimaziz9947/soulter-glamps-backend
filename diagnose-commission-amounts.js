/**
 * Commission Amounts Diagnostic Script
 * 
 * This script:
 * 1. Queries the database directly to see actual commission data
 * 2. Shows the raw amount values from DB
 * 3. Helps verify our fix will work correctly
 * 
 * Usage: node diagnose-commission-amounts.js
 */

import prisma from './src/config/prisma.js';

async function diagnose() {
  console.log('\n🔍 Commission Amounts Diagnostic');
  console.log('='.repeat(60));

  try {
    // Get total count
    const totalCount = await prisma.commission.count();
    console.log(`\n📊 Total commissions in DB: ${totalCount}`);

    if (totalCount === 0) {
      console.log('⚠️  No commissions found in database');
      return;
    }

    // Get first 3 commissions with all fields
    console.log('\n📋 Sample Commissions (first 3):');
    const samples = await prisma.commission.findMany({
      take: 3,
      select: {
        id: true,
        status: true,
        amount: true,
        createdAt: true,
        agent: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    samples.forEach((commission, index) => {
      console.log(`\n  #${index + 1}:`);
      console.log(`    ID: ${commission.id}`);
      console.log(`    Status: ${commission.status}`);
      console.log(`    amount (raw from DB): ${commission.amount}`);
      console.log(`    amount in PKR: ${(commission.amount / 100).toFixed(2)}`);
      console.log(`    Agent: ${commission.agent?.name || 'N/A'}`);
      console.log(`    Created: ${commission.createdAt.toISOString()}`);
    });

    // Get aggregates by status
    console.log('\n\n📈 Aggregates by Status:');
    
    const unpaidAgg = await prisma.commission.aggregate({
      where: { status: 'UNPAID' },
      _count: { id: true },
      _sum: { amount: true },
    });

    const paidAgg = await prisma.commission.aggregate({
      where: { status: 'PAID' },
      _count: { id: true },
      _sum: { amount: true },
    });

    const totalAgg = await prisma.commission.aggregate({
      _sum: { amount: true },
    });

    console.log('\n  UNPAID:');
    console.log(`    Count: ${unpaidAgg._count.id || 0}`);
    console.log(`    Sum (cents): ${unpaidAgg._sum.amount || 0}`);
    console.log(`    Sum (PKR): ${((unpaidAgg._sum.amount || 0) / 100).toFixed(2)}`);

    console.log('\n  PAID:');
    console.log(`    Count: ${paidAgg._count.id || 0}`);
    console.log(`    Sum (cents): ${paidAgg._sum.amount || 0}`);
    console.log(`    Sum (PKR): ${((paidAgg._sum.amount || 0) / 100).toFixed(2)}`);

    console.log('\n  TOTAL:');
    console.log(`    Sum (cents): ${totalAgg._sum.amount || 0}`);
    console.log(`    Sum (PKR): ${((totalAgg._sum.amount || 0) / 100).toFixed(2)}`);

    console.log('\n\n✅ Expected API Response (after fix):');
    console.log('  Each item should have:');
    console.log('    - amount: <cents value>');
    console.log('    - amountCents: <same cents value> (mapped from amount)');
    console.log('  Aggregates should have:');
    console.log(`    - pendingAmountCents: ${unpaidAgg._sum.amount || 0}`);
    console.log(`    - paidAmountCents: ${paidAgg._sum.amount || 0}`);
    console.log(`    - totalAmountCents: ${totalAgg._sum.amount || 0}`);

    // Check the user's expected values
    console.log('\n\n🎯 Checking User\'s Expected Values:');
    console.log('  User expects:');
    console.log('    - Pending: PKR 40,000 = 4,000,000 cents');
    console.log('    - Paid: PKR 75,000 = 7,500,000 cents');
    console.log('    - Total: PKR 115,000 = 11,500,000 cents');
    console.log('\n  Actual values from DB:');
    console.log(`    - Pending: ${unpaidAgg._sum.amount || 0} cents = PKR ${((unpaidAgg._sum.amount || 0) / 100).toFixed(2)}`);
    console.log(`    - Paid: ${paidAgg._sum.amount || 0} cents = PKR ${((paidAgg._sum.amount || 0) / 100).toFixed(2)}`);
    console.log(`    - Total: ${totalAgg._sum.amount || 0} cents = PKR ${((totalAgg._sum.amount || 0) / 100).toFixed(2)}`);

    if (unpaidAgg._sum.amount === 4000000 && paidAgg._sum.amount === 7500000) {
      console.log('\n  ✅ Values MATCH user expectations!');
    } else {
      console.log('\n  ⚠️  Values DO NOT match exactly - this may be due to different date range or filters');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
