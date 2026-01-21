/**
 * Test script for booking availability check and double-booking prevention
 * Tests the new availability endpoint and validates double-booking prevention
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

// Test data - replace with actual IDs from your database
const TEST_GLAMP_ID = process.env.TEST_GLAMP_ID || 'PASTE_GLAMP_ID_HERE';
const TEST_ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN || 'PASTE_ADMIN_TOKEN_HERE';

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
    console.error('Request failed:', error.message);
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
 * Test 1: Check availability for a glamp (should be available initially)
 */
async function testAvailabilityCheck() {
  console.log('\n📋 Test 1: Check availability for a glamp');
  console.log('─'.repeat(60));

  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30); // 30 days from now

  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3); // 3 nights

  const url = `/api/bookings/availability?glampId=${TEST_GLAMP_ID}&checkIn=${formatDate(checkIn)}&checkOut=${formatDate(checkOut)}`;
  console.log('GET', BASE_URL + url);

  const { status, data } = await request(url);

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success) {
    console.log('✅ Availability check successful');
    console.log('   Available:', data.data.available);
    console.log('   Conflicts:', data.data.conflictingCount);
    return { checkIn: formatDate(checkIn), checkOut: formatDate(checkOut) };
  } else {
    console.log('❌ Availability check failed');
    return null;
  }
}

/**
 * Test 2: Create a booking
 */
async function testCreateBooking(checkIn, checkOut) {
  console.log('\n📝 Test 2: Create a booking');
  console.log('─'.repeat(60));

  const bookingData = {
    customerName: 'Test User',
    customerEmail: `test-${Date.now()}@example.com`,
    glampId: TEST_GLAMP_ID,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guests: 2,
  };

  console.log('POST', BASE_URL + '/api/bookings');
  console.log('Body:', JSON.stringify(bookingData, null, 2));

  const { status, data } = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 201 && data.success) {
    console.log('✅ Booking created successfully');
    console.log('   Booking ID:', data.booking.id);
    return data.booking.id;
  } else {
    console.log('❌ Booking creation failed');
    return null;
  }
}

/**
 * Test 3: Check availability again (should show conflict)
 */
async function testAvailabilityWithConflict(checkIn, checkOut) {
  console.log('\n🔍 Test 3: Check availability with existing booking');
  console.log('─'.repeat(60));

  const url = `/api/bookings/availability?glampId=${TEST_GLAMP_ID}&checkIn=${checkIn}&checkOut=${checkOut}`;
  console.log('GET', BASE_URL + url);

  const { status, data } = await request(url);

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success) {
    console.log('✅ Availability check successful');
    console.log('   Available:', data.data.available);
    console.log('   Conflicts:', data.data.conflictingCount);
    if (!data.data.available && data.data.conflictingCount > 0) {
      console.log('✅ Conflict detected correctly!');
      console.log('   Conflicting bookings:', JSON.stringify(data.data.conflicts, null, 2));
    }
  } else {
    console.log('❌ Availability check failed');
  }
}

/**
 * Test 4: Try to create overlapping booking (should fail)
 */
async function testDoubleBookingPrevention(checkIn, checkOut) {
  console.log('\n🚫 Test 4: Attempt to create overlapping booking');
  console.log('─'.repeat(60));

  // Create an overlapping date range
  const overlapCheckIn = new Date(checkIn);
  overlapCheckIn.setDate(overlapCheckIn.getDate() + 1); // Start 1 day later

  const overlapCheckOut = new Date(checkOut);
  overlapCheckOut.setDate(overlapCheckOut.getDate() + 1); // End 1 day later

  const bookingData = {
    customerName: 'Test User 2',
    customerEmail: `test2-${Date.now()}@example.com`,
    glampId: TEST_GLAMP_ID,
    checkInDate: formatDate(overlapCheckIn),
    checkOutDate: formatDate(overlapCheckOut),
    guests: 2,
  };

  console.log('POST', BASE_URL + '/api/bookings');
  console.log('Body:', JSON.stringify(bookingData, null, 2));

  const { status, data } = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 409 || (status === 422 && !data.success)) {
    console.log('✅ Double booking prevented correctly!');
    console.log('   Response format:', data.message ? 'message' : 'error');
    if (data.message) {
      console.log('   Message:', data.message);
      console.log('   Data:', JSON.stringify(data.data, null, 2));
    } else {
      console.log('   Error:', data.error || data.message);
    }
  } else {
    console.log('❌ Double booking was NOT prevented - this is a bug!');
  }
}

/**
 * Test 5: Check availability with invalid parameters
 */
async function testInvalidParameters() {
  console.log('\n⚠️  Test 5: Test validation with invalid parameters');
  console.log('─'.repeat(60));

  // Test 5a: Missing parameters
  console.log('\n5a. Missing parameters:');
  const { status: status1, data: data1 } = await request('/api/bookings/availability?glampId=' + TEST_GLAMP_ID);
  console.log('Status:', status1, '- Should be 400');
  console.log('Response:', JSON.stringify(data1, null, 2));

  // Test 5b: Invalid date format
  console.log('\n5b. Invalid date format:');
  const { status: status2, data: data2 } = await request(
    `/api/bookings/availability?glampId=${TEST_GLAMP_ID}&checkIn=invalid-date&checkOut=2026-02-01`
  );
  console.log('Status:', status2, '- Should be 400');
  console.log('Response:', JSON.stringify(data2, null, 2));

  // Test 5c: Check-out before check-in
  console.log('\n5c. Check-out before check-in:');
  const { status: status3, data: data3 } = await request(
    `/api/bookings/availability?glampId=${TEST_GLAMP_ID}&checkIn=2026-03-01&checkOut=2026-02-28`
  );
  console.log('Status:', status3, '- Should be 400 or 422');
  console.log('Response:', JSON.stringify(data3, null, 2));

  if (status1 === 400 && status2 === 400) {
    console.log('\n✅ Validation working correctly!');
  } else {
    console.log('\n⚠️  Some validation tests failed');
  }
}

/**
 * Test 6: Check non-overlapping dates (should be available)
 */
async function testNonOverlappingDates(originalCheckIn, originalCheckOut) {
  console.log('\n✅ Test 6: Check availability for non-overlapping dates');
  console.log('─'.repeat(60));

  // Create dates 1 week after original booking
  const newCheckIn = new Date(originalCheckOut);
  newCheckIn.setDate(newCheckIn.getDate() + 1); // Day after original checkout

  const newCheckOut = new Date(newCheckIn);
  newCheckOut.setDate(newCheckOut.getDate() + 3); // 3 nights

  const url = `/api/bookings/availability?glampId=${TEST_GLAMP_ID}&checkIn=${formatDate(newCheckIn)}&checkOut=${formatDate(newCheckOut)}`;
  console.log('GET', BASE_URL + url);

  const { status, data } = await request(url);

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success && data.data.available) {
    console.log('✅ Non-overlapping dates correctly shown as available');
  } else {
    console.log('❌ Non-overlapping dates incorrectly shown as unavailable');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Booking Availability Check & Double-Booking Prevention   ║');
  console.log('║                      Test Suite                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nBase URL:', BASE_URL);
  console.log('Test Glamp ID:', TEST_GLAMP_ID);
  console.log('\n⚠️  Make sure to update TEST_GLAMP_ID with a valid glamp ID!');
  console.log('⚠️  You can find a glamp ID from your database or API');

  if (TEST_GLAMP_ID === 'PASTE_GLAMP_ID_HERE') {
    console.log('\n❌ ERROR: Please set TEST_GLAMP_ID before running tests!');
    console.log('   You can set it as an environment variable:');
    console.log('   $env:TEST_GLAMP_ID = "your-glamp-id-here"; node test-availability-check.js');
    return;
  }

  try {
    // Test 1: Initial availability check
    const dates = await testAvailabilityCheck();
    if (!dates) {
      console.log('\n❌ Initial availability check failed. Cannot continue tests.');
      return;
    }

    // Test 2: Create a booking
    const bookingId = await testCreateBooking(dates.checkIn, dates.checkOut);
    if (!bookingId) {
      console.log('\n❌ Booking creation failed. Cannot continue tests.');
      return;
    }

    // Test 3: Check availability again (should show conflict)
    await testAvailabilityWithConflict(dates.checkIn, dates.checkOut);

    // Test 4: Try to create overlapping booking
    await testDoubleBookingPrevention(dates.checkIn, dates.checkOut);

    // Test 5: Invalid parameters
    await testInvalidParameters();

    // Test 6: Non-overlapping dates
    await testNonOverlappingDates(dates.checkIn, dates.checkOut);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   Test Suite Complete                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n✅ All tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Review test results above');
    console.log('   2. Check Prisma Studio to verify booking was created');
    console.log('   3. Test in Postman with different date ranges');
    console.log('   4. Test with admin and agent booking creation');

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    console.error(error.stack);
  }
}

// Run tests
runTests();
