/**
 * Test script for 409 Conflict response on double-booking attempts
 * Verifies that booking conflicts return proper 409 status with detailed data
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
 * Test: Create booking and verify 409 on conflict
 */
async function testBookingConflict() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       Booking Conflict 409 Response Test                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (TEST_GLAMP_ID === 'PASTE_GLAMP_ID_HERE') {
    console.log('❌ ERROR: Please set TEST_GLAMP_ID!');
    console.log('   Usage: $env:TEST_GLAMP_ID = "your-glamp-id"; node test-booking-conflict.js');
    return;
  }

  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30);
  
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);

  // Step 1: Create first booking
  console.log('📝 Step 1: Create first booking');
  console.log('─'.repeat(60));
  
  const booking1Data = {
    customerName: 'Test User 1',
    customerEmail: `test1-${Date.now()}@example.com`,
    glampId: TEST_GLAMP_ID,
    checkInDate: formatDate(checkIn),
    checkOutDate: formatDate(checkOut),
    guests: 2,
  };

  console.log('POST', BASE_URL + '/api/bookings');
  console.log('Dates:', formatDate(checkIn), 'to', formatDate(checkOut));

  const { status: status1, data: data1 } = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(booking1Data),
  });

  console.log('Status:', status1);
  
  if (status1 !== 201) {
    console.log('Response:', JSON.stringify(data1, null, 2));
    console.log('\n❌ Failed to create first booking');
    return;
  }

  console.log('✅ First booking created:', data1.booking.id);
  const firstBookingId = data1.booking.id;

  // Step 2: Try to create conflicting booking (exact same dates)
  console.log('\n🚫 Step 2: Attempt to create conflicting booking (same dates)');
  console.log('─'.repeat(60));

  const booking2Data = {
    customerName: 'Test User 2',
    customerEmail: `test2-${Date.now()}@example.com`,
    glampId: TEST_GLAMP_ID,
    checkInDate: formatDate(checkIn),
    checkOutDate: formatDate(checkOut),
    guests: 2,
  };

  console.log('POST', BASE_URL + '/api/bookings');
  console.log('Dates:', formatDate(checkIn), 'to', formatDate(checkOut), '(SAME AS FIRST)');

  const { status: status2, data: data2 } = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(booking2Data),
  });

  console.log('\nStatus:', status2);
  console.log('Response:', JSON.stringify(data2, null, 2));

  // Verify 409 response
  if (status2 === 409) {
    console.log('\n✅ SUCCESS: Got 409 Conflict as expected!');
    
    // Verify response structure
    const hasCorrectStructure = 
      data2.success === false &&
      data2.message &&
      data2.data &&
      data2.data.available === false &&
      typeof data2.data.conflictingCount === 'number';

    if (hasCorrectStructure) {
      console.log('✅ Response structure is correct:');
      console.log('   - success: false');
      console.log('   - message:', data2.message);
      console.log('   - data.available:', data2.data.available);
      console.log('   - data.conflictingCount:', data2.data.conflictingCount);
      if (data2.data.conflicts && data2.data.conflicts.length > 0) {
        console.log('   - data.conflicts:', data2.data.conflicts.length, 'conflict(s)');
        console.log('     First conflict:', data2.data.conflicts[0].id.substring(0, 8) + '...');
      }
    } else {
      console.log('⚠️  Response structure is incorrect');
      console.log('   Expected: { success: false, message: "...", data: { available, conflictingCount, conflicts } }');
    }
  } else if (status2 === 201) {
    console.log('\n❌ FAILED: Booking was created (double-booking NOT prevented!)');
    console.log('   This is a critical bug - the same dates should be blocked');
  } else {
    console.log('\n⚠️  Got unexpected status:', status2);
    console.log('   Expected: 409 Conflict');
  }

  // Step 3: Try partial overlap
  console.log('\n🚫 Step 3: Attempt partial overlap booking');
  console.log('─'.repeat(60));

  const overlapCheckIn = new Date(checkIn);
  overlapCheckIn.setDate(overlapCheckIn.getDate() + 1);
  
  const overlapCheckOut = new Date(checkOut);
  overlapCheckOut.setDate(overlapCheckOut.getDate() + 1);

  const booking3Data = {
    customerName: 'Test User 3',
    customerEmail: `test3-${Date.now()}@example.com`,
    glampId: TEST_GLAMP_ID,
    checkInDate: formatDate(overlapCheckIn),
    checkOutDate: formatDate(overlapCheckOut),
    guests: 2,
  };

  console.log('POST', BASE_URL + '/api/bookings');
  console.log('Original:', formatDate(checkIn), 'to', formatDate(checkOut));
  console.log('New:     ', formatDate(overlapCheckIn), 'to', formatDate(overlapCheckOut), '(OVERLAPS)');

  const { status: status3, data: data3 } = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(booking3Data),
  });

  console.log('\nStatus:', status3);
  
  if (status3 === 409) {
    console.log('✅ Partial overlap correctly prevented with 409');
  } else if (status3 === 201) {
    console.log('❌ Partial overlap was NOT prevented!');
  } else {
    console.log('⚠️  Got unexpected status:', status3);
  }

  // Step 4: Try non-overlapping booking (should succeed)
  console.log('\n✅ Step 4: Create non-overlapping booking (should succeed)');
  console.log('─'.repeat(60));

  const nextCheckIn = new Date(checkOut);
  nextCheckIn.setDate(nextCheckIn.getDate() + 0); // Same day as checkout
  
  const nextCheckOut = new Date(nextCheckIn);
  nextCheckOut.setDate(nextCheckOut.getDate() + 3);

  const booking4Data = {
    customerName: 'Test User 4',
    customerEmail: `test4-${Date.now()}@example.com`,
    glampId: TEST_GLAMP_ID,
    checkInDate: formatDate(nextCheckIn),
    checkOutDate: formatDate(nextCheckOut),
    guests: 2,
  };

  console.log('POST', BASE_URL + '/api/bookings');
  console.log('Previous:', formatDate(checkIn), 'to', formatDate(checkOut));
  console.log('New:     ', formatDate(nextCheckIn), 'to', formatDate(nextCheckOut), '(NO OVERLAP)');

  const { status: status4, data: data4 } = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(booking4Data),
  });

  console.log('\nStatus:', status4);
  
  if (status4 === 201) {
    console.log('✅ Non-overlapping booking created successfully');
    console.log('   Booking ID:', data4.booking.id);
  } else {
    console.log('❌ Non-overlapping booking was rejected (should have been allowed)');
    console.log('   Response:', JSON.stringify(data4, null, 2));
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const results = {
    'First booking created': status1 === 201 ? '✅ PASS' : '❌ FAIL',
    'Same dates blocked (409)': status2 === 409 ? '✅ PASS' : '❌ FAIL',
    'Partial overlap blocked (409)': status3 === 409 ? '✅ PASS' : '❌ FAIL',
    'Non-overlap allowed (201)': status4 === 201 ? '✅ PASS' : '❌ FAIL',
  };

  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result.padEnd(10)} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r.includes('PASS'));
  
  console.log('\n' + (allPassed ? '✅ All tests PASSED!' : '❌ Some tests FAILED'));
  console.log('\n📝 Booking IDs created:');
  console.log('   First:', firstBookingId);
  if (status4 === 201) {
    console.log('   Second:', data4.booking.id);
  }
  console.log('\n💡 Check Prisma Studio to verify bookings: npx prisma studio');
}

// Run test
testBookingConflict();
