/**
 * Race Condition Test - Concurrent Booking Attempts
 * 
 * This test simulates multiple concurrent requests trying to book the same
 * glamp for the same dates to verify that the transaction-based protection
 * prevents double-booking even when requests arrive simultaneously.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';
const TEST_GLAMP_ID = process.env.TEST_GLAMP_ID || 'PASTE_GLAMP_ID_HERE';

/**
 * Helper function to make API requests
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

/**
 * Format date for API (YYYY-MM-DD)
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Create a booking request
 */
async function createBooking(customerNumber, checkIn, checkOut) {
  const bookingData = {
    customerName: `Test User ${customerNumber}`,
    customerEmail: `race-test-${customerNumber}-${Date.now()}@example.com`,
    glampId: TEST_GLAMP_ID,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guests: 2,
  };

  return request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

/**
 * Main test - Send concurrent requests
 */
async function testRaceCondition() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         Race Condition Protection Test                    ║');
  console.log('║   (Concurrent booking attempts on same dates)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (TEST_GLAMP_ID === 'PASTE_GLAMP_ID_HERE') {
    console.log('❌ ERROR: Please set TEST_GLAMP_ID!');
    console.log('   Usage: $env:TEST_GLAMP_ID = "your-glamp-id"; node test-race-condition.js');
    return;
  }

  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 45); // 45 days from now
  
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);

  const checkInStr = formatDate(checkIn);
  const checkOutStr = formatDate(checkOut);

  console.log('📅 Test Dates:', checkInStr, 'to', checkOutStr);
  console.log('🏕️  Glamp ID:', TEST_GLAMP_ID);
  console.log('🔄 Sending 5 concurrent booking requests...\n');

  // Send 5 concurrent requests
  const promises = [];
  for (let i = 1; i <= 5; i++) {
    promises.push(createBooking(i, checkInStr, checkOutStr));
  }

  // Wait for all requests to complete
  const results = await Promise.all(promises);

  // Analyze results
  const successful = results.filter(r => r.status === 201);
  const conflicts = results.filter(r => r.status === 409);
  const errors = results.filter(r => r.status !== 201 && r.status !== 409);

  console.log('─'.repeat(60));
  console.log('📊 Results:');
  console.log('─'.repeat(60));
  
  results.forEach((result, index) => {
    const icon = result.status === 201 ? '✅' : result.status === 409 ? '🚫' : '❌';
    console.log(`${icon} Request ${index + 1}: HTTP ${result.status}`);
    if (result.status === 201) {
      console.log(`   Booking ID: ${result.data.booking?.id}`);
    } else if (result.status === 409) {
      console.log(`   Conflict: ${result.data.message}`);
      console.log(`   Conflicts: ${result.data.data?.conflictingCount || 0}`);
    }
  });

  console.log('\n' + '─'.repeat(60));
  console.log('Summary:');
  console.log('─'.repeat(60));
  console.log(`✅ Successful (201):  ${successful.length}`);
  console.log(`🚫 Conflicts (409):   ${conflicts.length}`);
  console.log(`❌ Errors (other):    ${errors.length}`);
  console.log('─'.repeat(60));

  // Verify test success
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Validation                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testPassed = successful.length === 1 && conflicts.length === 4 && errors.length === 0;

  if (testPassed) {
    console.log('✅ TEST PASSED!');
    console.log('   - Exactly 1 booking created (no double-booking)');
    console.log('   - Exactly 4 requests rejected with 409 Conflict');
    console.log('   - No unexpected errors');
    console.log('\n🎯 Race condition protection is working correctly!');
    console.log('   The transaction-based check prevented concurrent requests');
    console.log('   from creating duplicate bookings.');
  } else {
    console.log('❌ TEST FAILED!');
    
    if (successful.length > 1) {
      console.log(`   ⚠️  Multiple bookings created: ${successful.length}`);
      console.log('   This indicates a race condition bug!');
      console.log('   Created booking IDs:');
      successful.forEach(r => {
        console.log(`      - ${r.data.booking?.id}`);
      });
    }
    
    if (successful.length === 0) {
      console.log('   ⚠️  No bookings created - all requests failed');
      console.log('   Check if the glamp ID is valid or server is running');
    }
    
    if (errors.length > 0) {
      console.log(`   ⚠️  Unexpected errors: ${errors.length}`);
      errors.forEach((err, i) => {
        console.log(`      Error ${i + 1}: ${err.status} - ${err.error || err.data?.error}`);
      });
    }
  }

  console.log('\n📝 Created Booking ID:', successful[0]?.data?.booking?.id || 'None');
  console.log('💡 Check Prisma Studio to verify: npx prisma studio\n');

  return testPassed;
}

/**
 * Additional test - Verify different date ranges don't conflict
 */
async function testNonConflictingRace() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Non-Conflicting Concurrent Bookings Test              ║');
  console.log('║   (Different dates should all succeed)                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('🔄 Sending 3 concurrent requests with different dates...\n');

  const promises = [];
  
  // Create 3 bookings with non-overlapping dates
  for (let i = 0; i < 3; i++) {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 50 + (i * 5)); // Spaced 5 days apart
    
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3);
    
    promises.push(createBooking(i + 10, formatDate(checkIn), formatDate(checkOut)));
  }

  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.status === 201);
  const failed = results.filter(r => r.status !== 201);

  console.log('─'.repeat(60));
  console.log('📊 Results:');
  console.log('─'.repeat(60));
  
  results.forEach((result, index) => {
    const icon = result.status === 201 ? '✅' : '❌';
    console.log(`${icon} Request ${index + 1}: HTTP ${result.status}`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ Successful: ${successful.length} / 3`);
  console.log(`❌ Failed:     ${failed.length} / 3`);
  console.log('─'.repeat(60));

  const passed = successful.length === 3;
  
  if (passed) {
    console.log('\n✅ TEST PASSED! All non-conflicting bookings created.');
  } else {
    console.log('\n❌ TEST FAILED! Some non-conflicting bookings were rejected.');
  }

  return passed;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Race Condition Protection Test Suite\n');
  console.log('Base URL:', BASE_URL);
  console.log('Test Glamp ID:', TEST_GLAMP_ID);
  
  // Test 1: Race condition with same dates
  const test1 = await testRaceCondition();
  
  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Non-conflicting concurrent requests
  const test2 = await testNonConflictingRace();
  
  // Final summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  Final Test Summary                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Race Condition Test:           ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Non-Conflicting Bookings Test: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 All tests passed! Race condition protection is working perfectly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the results above.');
  }
}

// Run tests
runAllTests();
