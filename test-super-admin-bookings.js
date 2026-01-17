/**
 * Test script for Super Admin Bookings API
 * Tests all endpoints with various query parameters
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001';

// You'll need to replace this with a valid SUPER_ADMIN token
const SUPER_ADMIN_TOKEN = process.env.SUPER_ADMIN_TOKEN || 'your-super-admin-jwt-token-here';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPER_ADMIN_TOKEN}`,
};

async function testGetAllBookings() {
  console.log('\n=== Testing GET /api/super-admin/bookings ===\n');

  // Test 1: Get all bookings (default params)
  console.log('Test 1: Get all bookings (default params)');
  const response1 = await fetch(`${BASE_URL}/api/super-admin/bookings`, { headers });
  const data1 = await response1.json();
  console.log('Status:', response1.status);
  console.log('Success:', data1.success);
  console.log('Items count:', data1.data?.items?.length || 0);
  console.log('Meta:', data1.data?.meta);
  console.log('Range:', data1.data?.range);

  // Test 2: With pagination
  console.log('\n\nTest 2: With pagination (page=1, limit=5)');
  const response2 = await fetch(`${BASE_URL}/api/super-admin/bookings?page=1&limit=5`, { headers });
  const data2 = await response2.json();
  console.log('Status:', response2.status);
  console.log('Items count:', data2.data?.items?.length || 0);
  console.log('Meta:', data2.data?.meta);

  // Test 3: With status filter
  console.log('\n\nTest 3: With status filter (status=CONFIRMED)');
  const response3 = await fetch(`${BASE_URL}/api/super-admin/bookings?status=CONFIRMED`, { headers });
  const data3 = await response3.json();
  console.log('Status:', response3.status);
  console.log('Items count:', data3.data?.items?.length || 0);
  console.log('First item status:', data3.data?.items?.[0]?.status);

  // Test 4: With search
  console.log('\n\nTest 4: With search (search term)');
  const response4 = await fetch(`${BASE_URL}/api/super-admin/bookings?search=test`, { headers });
  const data4 = await response4.json();
  console.log('Status:', response4.status);
  console.log('Items count:', data4.data?.items?.length || 0);

  // Test 5: With date range
  console.log('\n\nTest 5: With date range (last 7 days)');
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const response5 = await fetch(`${BASE_URL}/api/super-admin/bookings?from=${from}&to=${to}`, { headers });
  const data5 = await response5.json();
  console.log('Status:', response5.status);
  console.log('Items count:', data5.data?.items?.length || 0);
  console.log('Range:', data5.data?.range);

  // Test 6: With sort
  console.log('\n\nTest 6: With sort (totalAmount_desc)');
  const response6 = await fetch(`${BASE_URL}/api/super-admin/bookings?sort=totalAmount_desc&limit=5`, { headers });
  const data6 = await response6.json();
  console.log('Status:', response6.status);
  console.log('Items count:', data6.data?.items?.length || 0);
  if (data6.data?.items?.length > 0) {
    console.log('First item amount (cents):', data6.data.items[0].totalAmountCents);
    console.log('Last item amount (cents):', data6.data.items[data6.data.items.length - 1].totalAmountCents);
  }

  return data1.data?.items?.[0]?.id; // Return first booking ID for next test
}

async function testGetBookingById(bookingId) {
  console.log('\n\n=== Testing GET /api/super-admin/bookings/:id ===\n');

  if (!bookingId) {
    console.log('No booking ID available, skipping test');
    return;
  }

  console.log('Test: Get booking by ID:', bookingId);
  const response = await fetch(`${BASE_URL}/api/super-admin/bookings/${bookingId}`, { headers });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Success:', data.success);
  
  if (data.success) {
    console.log('\nBooking details:');
    console.log('- ID:', data.data.id);
    console.log('- Status:', data.data.status);
    console.log('- Total Amount (cents):', data.data.totalAmount);
    console.log('- Customer:', data.data.customer?.name);
    console.log('- Agent:', data.data.agent?.name || 'None');
    console.log('- Glamp:', data.data.glamp?.name);
    console.log('- Glamp Price/Night (cents):', data.data.glamp?.pricePerNight);
    console.log('- Commission:', data.data.commission ? `${data.data.commission.amount} cents` : 'No');
    console.log('- Incomes count:', data.data.incomes?.length || 0);
    if (data.data.incomes?.length > 0) {
      console.log('- First income amount (cents):', data.data.incomes[0].amount);
    }
  }

  // Test 2: Non-existent booking
  console.log('\n\nTest: Non-existent booking');
  const response2 = await fetch(`${BASE_URL}/api/super-admin/bookings/non-existent-id`, { headers });
  const data2 = await response2.json();
  console.log('Status:', response2.status);
  console.log('Success:', data2.success);
  console.log('Error:', data2.error);
}

async function testUnauthorizedAccess() {
  console.log('\n\n=== Testing Unauthorized Access ===\n');

  console.log('Test: Access without token');
  const response1 = await fetch(`${BASE_URL}/api/super-admin/bookings`);
  const data1 = await response1.json();
  console.log('Status:', response1.status);
  console.log('Success:', data1.success);
  console.log('Error:', data1.error);
}

async function runAllTests() {
  console.log('🚀 Starting Super Admin Bookings API Tests');
  console.log('Base URL:', BASE_URL);
  console.log('Token configured:', !!SUPER_ADMIN_TOKEN && SUPER_ADMIN_TOKEN !== 'your-super-admin-jwt-token-here');

  try {
    // Test unauthorized access first
    await testUnauthorizedAccess();

    // Test authorized endpoints
    const firstBookingId = await testGetAllBookings();
    await testGetBookingById(firstBookingId);

    console.log('\n\n✅ All tests completed!');
  } catch (error) {
    console.error('\n\n❌ Test error:', error.message);
    console.error(error);
  }
}

// Run tests
runAllTests();
