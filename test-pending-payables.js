/**
 * Test Script: Verify Pending Payables Calculation
 * 
 * Purpose: Validate that pendingPayables calculation correctly sums outstanding amounts:
 * - Formula: SUM(amount - paidAmountCents) for status UNPAID/PARTIAL
 * - Test scenario: 3 payables with totals 10k, 30k, 18k and 15k paid on second
 * - Expected outstanding: 10k + (30k - 15k) + 18k = 43k
 */

import prisma from './src/config/prisma.js';

async function testPendingPayablesCalculation() {
  console.log('\n========================================');
  console.log('🧪 Pending Payables Calculation Test');
  console.log('========================================\n');

  try {
    // ============================================
    // 1. Fetch ALL pending payables (UNPAID + PARTIAL)
    // ============================================
    const pendingPayables = await prisma.purchase.findMany({
      where: {
        deletedAt: null,
        status: { in: ['DRAFT', 'CONFIRMED'] },
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      select: {
        id: true,
        amount: true,
        paidAmountCents: true,
        paymentStatus: true,
        vendorName: true,
        purchaseDate: true,
      },
      orderBy: { purchaseDate: 'desc' },
    });

    console.log(`📊 Found ${pendingPayables.length} pending payables\n`);

    // ============================================
    // 2. Calculate outstanding amount for each
    // ============================================
    let totalOutstanding = 0;
    const payableDetails = [];

    pendingPayables.forEach((purchase) => {
      const outstanding = purchase.amount - (purchase.paidAmountCents || 0);
      totalOutstanding += outstanding;

      payableDetails.push({
        vendor: purchase.vendorName,
        status: purchase.paymentStatus,
        total: purchase.amount / 100,
        paid: (purchase.paidAmountCents || 0) / 100,
        outstanding: outstanding / 100,
        date: purchase.purchaseDate.toISOString().split('T')[0],
      });
    });

    // ============================================
    // 3. Display results
    // ============================================
    console.log('Individual Payables:');
    console.log('─'.repeat(80));
    payableDetails.forEach((p, idx) => {
      console.log(
        `${idx + 1}. ${p.vendor.padEnd(25)} | ` +
        `Status: ${p.status.padEnd(8)} | ` +
        `Total: $${p.total.toFixed(2).padStart(8)} | ` +
        `Paid: $${p.paid.toFixed(2).padStart(8)} | ` +
        `Outstanding: $${p.outstanding.toFixed(2).padStart(8)}`
      );
    });
    console.log('─'.repeat(80));

    console.log(`\n💰 Total Outstanding: $${(totalOutstanding / 100).toFixed(2)} (${totalOutstanding} cents)`);
    console.log(`📦 Total Payables Count: ${pendingPayables.length}`);

    // ============================================
    // 4. Verify test scenario (if applicable)
    // ============================================
    console.log('\n📝 Test Scenario Validation:');
    console.log('   Expected: 3 payables (10k, 30k, 18k) with 15k paid on second = 43k outstanding');
    
    // Check if we have exactly 3 payables
    if (pendingPayables.length === 3) {
      const amounts = payableDetails.map(p => p.outstanding * 100);
      const testScenario = [10000, 15000, 18000]; // Expected outstanding amounts
      
      console.log(`   Actual outstanding amounts: ${amounts.map(a => `$${(a / 100).toFixed(2)}`).join(', ')}`);
      
      if (totalOutstanding === 43000) {
        console.log('   ✅ PASS: Outstanding total matches expected 43k');
      } else {
        console.log(`   ⚠️  Note: Outstanding total is ${totalOutstanding / 100}, not 43k`);
      }
    } else {
      console.log(`   ℹ️  Database has ${pendingPayables.length} payables, not exactly 3 from test scenario`);
    }

    // ============================================
    // 5. Fetch dashboard API response for comparison
    // ============================================
    console.log('\n📡 Comparing with Dashboard API calculation...');
    
    const { getDashboard } = await import('./src/modules/finance/dashboard/dashboard.service.js');
    
    // Call dashboard without date filters to get ALL payables
    const dashboardResponse = await getDashboard({});
    
    const dashboardPending = dashboardResponse.kpis.pendingPayables;
    
    console.log('\nDashboard API Response:');
    console.log(`   Count: ${dashboardPending.count}`);
    console.log(`   Amount: $${(dashboardPending.amountCents / 100).toFixed(2)} (${dashboardPending.amountCents} cents)`);
    console.log(`   Currency: ${dashboardPending.currency}`);

    // ============================================
    // 6. Verify consistency
    // ============================================
    console.log('\n🔍 Consistency Check:');
    
    if (dashboardPending.count === pendingPayables.length) {
      console.log('   ✅ Count matches');
    } else {
      console.log(`   ❌ Count mismatch: Direct=${pendingPayables.length}, Dashboard=${dashboardPending.count}`);
    }

    if (dashboardPending.amountCents === totalOutstanding) {
      console.log('   ✅ Amount matches');
    } else {
      console.log(`   ❌ Amount mismatch: Direct=${totalOutstanding}, Dashboard=${dashboardPending.amountCents}`);
    }

    console.log('\n========================================');
    console.log('✅ Test Complete');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPendingPayablesCalculation().catch(console.error);
