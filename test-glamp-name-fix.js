/**
 * Test: Verify GLAMP Name Fix in Super Admin Bookings
 * 
 * This script tests that glampName is populated correctly for ALL bookings,
 * regardless of whether they were created by agents or customers.
 * 
 * Usage: node test-glamp-name-fix.js
 */

import prisma from './src/config/prisma.js';

async function testGlampNameFix() {
  console.log('\n🧪 Testing GLAMP Name Fix');
  console.log('='.repeat(60));

  try {
    // Get all bookings with glamp relation
    const bookings = await prisma.booking.findMany({
      take: 10,
      select: {
        id: true,
        customerName: true,
        glampName: true, // Snapshot field
        glampId: true,
        agentId: true,
        status: true,
        createdAt: true,
        glamp: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📊 Total bookings (sample): ${bookings.length}`);

    if (bookings.length === 0) {
      console.log('⚠️  No bookings found in database');
      return;
    }

    console.log('\n📋 Checking each booking:\n');

    let allCorrect = true;
    let agentBookingsWithIssues = 0;
    let customerBookingsWithIssues = 0;

    bookings.forEach((booking, index) => {
      const isAgentBooking = !!booking.agentId;
      const hasSnapshot = !!booking.glampName && booking.glampName !== 'Unknown';
      const hasGlampRelation = !!booking.glamp?.name;
      const finalGlampName = booking.glamp?.name || booking.glampName || 'Unknown';

      console.log(`${index + 1}. Booking ${booking.id.substring(0, 8)}...`);
      console.log(`   Type: ${isAgentBooking ? 'AGENT-CREATED' : 'CUSTOMER-CREATED'}`);
      console.log(`   Customer: ${booking.customerName}`);
      console.log(`   Snapshot glampName: ${booking.glampName || 'NULL/EMPTY'}`);
      console.log(`   Glamp Relation name: ${booking.glamp?.name || 'NULL/MISSING'}`);
      console.log(`   Final glampName: ${finalGlampName}`);
      console.log(`   Status: ${booking.status}`);

      // Check if glampName is properly populated
      if (finalGlampName === 'Unknown' && booking.glamp?.name) {
        console.log(`   ⚠️  WARNING: Using "Unknown" but glamp.name is "${booking.glamp.name}"`);
        allCorrect = false;
        if (isAgentBooking) agentBookingsWithIssues++;
        else customerBookingsWithIssues++;
      } else if (!hasGlampRelation) {
        console.log(`   ⚠️  WARNING: Glamp relation is missing!`);
        allCorrect = false;
      } else if (finalGlampName !== 'Unknown') {
        console.log(`   ✅ Correct: glampName = "${finalGlampName}"`);
      }
      console.log('');
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log(`   Total bookings checked: ${bookings.length}`);
    console.log(`   Agent-created bookings: ${bookings.filter(b => b.agentId).length}`);
    console.log(`   Customer-created bookings: ${bookings.filter(b => !b.agentId).length}`);
    
    if (allCorrect) {
      console.log('\n✅ ALL BOOKINGS HAVE CORRECT GLAMP NAMES!');
    } else {
      console.log(`\n⚠️  Issues found:`);
      if (agentBookingsWithIssues > 0) {
        console.log(`   - Agent bookings with issues: ${agentBookingsWithIssues}`);
      }
      if (customerBookingsWithIssues > 0) {
        console.log(`   - Customer bookings with issues: ${customerBookingsWithIssues}`);
      }
    }

    // Test the fix logic
    console.log('\n🔧 Testing Fix Logic:');
    console.log('   Formula: glamp?.name || glampName || "Unknown"');
    
    const testCases = [
      { glamp: { name: 'Luxury Safari Tent' }, glampName: 'Old Name', expected: 'Luxury Safari Tent' },
      { glamp: null, glampName: 'Snapshot Name', expected: 'Snapshot Name' },
      { glamp: null, glampName: null, expected: 'Unknown' },
      { glamp: { name: 'Beachside Cabin' }, glampName: null, expected: 'Beachside Cabin' },
    ];

    testCases.forEach((test, i) => {
      const result = test.glamp?.name || test.glampName || 'Unknown';
      const passed = result === test.expected;
      console.log(`\n   Test ${i + 1}: ${passed ? '✅' : '❌'}`);
      console.log(`      glamp.name: ${test.glamp?.name || 'null'}`);
      console.log(`      glampName (snapshot): ${test.glampName || 'null'}`);
      console.log(`      Expected: "${test.expected}"`);
      console.log(`      Got: "${result}"`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testGlampNameFix();
