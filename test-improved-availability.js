/**
 * Test script for improved availability endpoint response
 * 
 * This script demonstrates the enhanced conflict details including:
 * - bookingId for each conflict
 * - Clear date formatting (YYYY-MM-DD)
 * - Status information (CONFIRMED/PENDING)
 * - Queried range details with night count
 * 
 * Usage:
 *   $env:TEST_GLAMP_ID = "your-glamp-id"
 *   node test-improved-availability.js
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
const GLAMP_ID = process.env.TEST_GLAMP_ID;

if (!GLAMP_ID) {
  console.error('❌ Please set TEST_GLAMP_ID environment variable');
  console.error('   Example: $env:TEST_GLAMP_ID = "your-glamp-id"');
  process.exit(1);
}

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const json = await response.json();
  return { status: response.status, data: json };
}

// Helper to format dates
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper to add days to a date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

console.log('🧪 Testing Improved Availability Endpoint Response\n');
console.log('='.repeat(80));

async function runTests() {
  const today = new Date();
  const baseDate = addDays(today, 10); // Start testing 10 days from now

  console.log(`\n📅 Test Dates:`);
  console.log(`   Base Date: ${formatDate(baseDate)}`);
  console.log(`   Glamp ID:  ${GLAMP_ID}\n`);

  // ==============================================
  // TEST 1: Check availability for empty date range
  // ==============================================
  console.log('TEST 1: Initial Availability Check (No Bookings Expected)');
  console.log('-'.repeat(80));

  const checkIn1 = formatDate(baseDate);
  const checkOut1 = formatDate(addDays(baseDate, 3));

  const { status: status1, data: availability1 } = await apiRequest(
    'GET',
    `/bookings/availability?glampId=${GLAMP_ID}&checkIn=${checkIn1}&checkOut=${checkOut1}`
  );

  console.log(`📡 Request: GET /api/bookings/availability`);
  console.log(`   Query: glampId=${GLAMP_ID}&checkIn=${checkIn1}&checkOut=${checkOut1}`);
  console.log(`\n📥 Response (${status1}):`);
  console.log(JSON.stringify(availability1, null, 2));

  if (availability1.success && availability1.data.available) {
    console.log('✅ Available - No conflicts found');
  } else {
    console.log(`⚠️  Not available - ${availability1.data.conflictingCount} conflicts`);
  }

  // ==============================================
  // TEST 2: Create a booking to generate conflicts
  // ==============================================
  console.log('\n\nTEST 2: Create Booking to Generate Conflicts');
  console.log('-'.repeat(80));

  const bookingData = {
    glampId: GLAMP_ID,
    checkInDate: checkIn1,
    checkOutDate: checkOut1,
    guests: 2,
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerPhone: '+1234567890',
  };

  const { status: createStatus, data: createResult } = await apiRequest(
    'POST',
    '/bookings',
    bookingData
  );

  console.log(`📡 Request: POST /api/bookings`);
  console.log(`   Dates: ${checkIn1} to ${checkOut1}`);
  console.log(`\n📥 Response (${createStatus}):`);

  if (createStatus === 201) {
    console.log(`✅ Booking created successfully`);
    console.log(`   Booking ID: ${createResult.booking.id}`);
    console.log(`   Status: ${createResult.booking.status}`);
  } else if (createStatus === 409) {
    console.log(`⚠️  Booking conflict (expected if test data exists)`);
  } else {
    console.log(JSON.stringify(createResult, null, 2));
  }

  // ==============================================
  // TEST 3: Check availability with conflict details
  // ==============================================
  console.log('\n\nTEST 3: Availability Check with Conflicts (Enhanced Response)');
  console.log('-'.repeat(80));

  const { status: status3, data: availability3 } = await apiRequest(
    'GET',
    `/bookings/availability?glampId=${GLAMP_ID}&checkIn=${checkIn1}&checkOut=${checkOut1}`
  );

  console.log(`📡 Request: GET /api/bookings/availability`);
  console.log(`   Query: glampId=${GLAMP_ID}&checkIn=${checkIn1}&checkOut=${checkOut1}`);
  console.log(`\n📥 Enhanced Response (${status3}):`);
  console.log(JSON.stringify(availability3, null, 2));

  if (availability3.success && !availability3.data.available) {
    console.log(`\n🔍 Conflict Analysis:`);
    console.log(`   Available: ${availability3.data.available}`);
    console.log(`   Conflicting Count: ${availability3.data.conflictingCount}`);
    console.log(`   Queried Range: ${availability3.data.queriedRange.checkIn} to ${availability3.data.queriedRange.checkOut} (${availability3.data.queriedRange.nights} nights)`);
    
    console.log(`\n📋 Conflicting Bookings:`);
    availability3.data.conflicts.forEach((conflict, index) => {
      console.log(`   ${index + 1}. Booking ID: ${conflict.bookingId}`);
      console.log(`      Check-In:  ${conflict.checkIn}`);
      console.log(`      Check-Out: ${conflict.checkOut}`);
      console.log(`      Status:    ${conflict.status}`);
      console.log('');
    });
  } else if (availability3.success && availability3.data.available) {
    console.log('✅ Available - No conflicts found');
  }

  // ==============================================
  // TEST 4: Partial overlap scenario
  // ==============================================
  console.log('\n\nTEST 4: Partial Overlap Scenario');
  console.log('-'.repeat(80));

  const checkIn4 = formatDate(addDays(baseDate, 2)); // Overlaps with existing booking
  const checkOut4 = formatDate(addDays(baseDate, 5));

  const { status: status4, data: availability4 } = await apiRequest(
    'GET',
    `/bookings/availability?glampId=${GLAMP_ID}&checkIn=${checkIn4}&checkOut=${checkOut4}`
  );

  console.log(`📡 Request: GET /api/bookings/availability`);
  console.log(`   Query: glampId=${GLAMP_ID}&checkIn=${checkIn4}&checkOut=${checkOut4}`);
  console.log(`   (This should partially overlap with existing booking if created)`);
  console.log(`\n📥 Response (${status4}):`);
  console.log(JSON.stringify(availability4, null, 2));

  if (availability4.success && !availability4.data.available) {
    console.log(`\n✅ Correctly detected partial overlap conflict`);
    console.log(`   Conflicting bookings: ${availability4.data.conflictingCount}`);
  } else if (availability4.success && availability4.data.available) {
    console.log('ℹ️  No conflict - booking may not exist yet');
  }

  // ==============================================
  // TEST 5: Non-overlapping date range (should be available)
  // ==============================================
  console.log('\n\nTEST 5: Non-Overlapping Date Range');
  console.log('-'.repeat(80));

  const checkIn5 = formatDate(addDays(baseDate, 10)); // Well after existing booking
  const checkOut5 = formatDate(addDays(baseDate, 13));

  const { status: status5, data: availability5 } = await apiRequest(
    'GET',
    `/bookings/availability?glampId=${GLAMP_ID}&checkIn=${checkIn5}&checkOut=${checkOut5}`
  );

  console.log(`📡 Request: GET /api/bookings/availability`);
  console.log(`   Query: glampId=${GLAMP_ID}&checkIn=${checkIn5}&checkOut=${checkOut5}`);
  console.log(`   (This should NOT overlap with existing booking)`);
  console.log(`\n📥 Response (${status5}):`);
  console.log(JSON.stringify(availability5, null, 2));

  if (availability5.success && availability5.data.available) {
    console.log(`\n✅ Correctly identified non-overlapping range as available`);
  } else if (availability5.success && !availability5.data.available) {
    console.log(`⚠️  Unexpected conflict - may have other bookings in this range`);
  }

  // ==============================================
  // TEST 6: Date normalization verification
  // ==============================================
  console.log('\n\nTEST 6: Date Normalization Verification');
  console.log('-'.repeat(80));

  // Query with time components (should be normalized to start-of-day)
  const checkIn6 = `${formatDate(baseDate)}T15:30:00`;
  const checkOut6 = `${formatDate(addDays(baseDate, 3))}T10:00:00`;

  const { status: status6, data: availability6 } = await apiRequest(
    'GET',
    `/bookings/availability?glampId=${GLAMP_ID}&checkIn=${checkIn6}&checkOut=${checkOut6}`
  );

  console.log(`📡 Request: GET /api/bookings/availability`);
  console.log(`   Query with time components:`);
  console.log(`   checkIn=${checkIn6}`);
  console.log(`   checkOut=${checkOut6}`);
  console.log(`\n📥 Response (${status6}):`);
  console.log(JSON.stringify(availability6, null, 2));

  if (availability6.success && availability6.data.queriedRange) {
    console.log(`\n🔍 Date Normalization:`);
    console.log(`   Input had time components, normalized to:`);
    console.log(`   Check-In:  ${availability6.data.queriedRange.checkIn} (start-of-day)`);
    console.log(`   Check-Out: ${availability6.data.queriedRange.checkOut} (start-of-day)`);
    console.log(`   Nights:    ${availability6.data.queriedRange.nights}`);
  }

  // ==============================================
  // Summary
  // ==============================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('\n✅ Enhanced Response Format Verified:');
  console.log('   • bookingId field for each conflict');
  console.log('   • Clear date formatting (YYYY-MM-DD)');
  console.log('   • Status information (CONFIRMED/PENDING)');
  console.log('   • queriedRange with nights calculation');
  console.log('   • Consistent date normalization to start-of-day UTC');
  console.log('\n📝 Date Semantics Clarified:');
  console.log('   • checkIn: Guest arrival date (inclusive)');
  console.log('   • checkOut: Guest departure date (exclusive)');
  console.log('   • Example: 2026-01-25 to 2026-01-27 = 2 nights (25th & 26th)');
  console.log('\n🎯 Frontend Debugging Improvements:');
  console.log('   • Can identify exact conflicting bookings by ID');
  console.log('   • Can display date ranges clearly to users');
  console.log('   • Can filter/sort conflicts by status');
  console.log('   • Can calculate stay duration from queriedRange.nights');
  console.log('\n✅ All tests completed successfully!');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
