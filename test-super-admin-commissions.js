/**
 * Super Admin Commissions API Test Script
 * 
 * This script tests all super admin commission endpoints
 * 
 * Prerequisites:
 * 1. Backend server running on http://localhost:5001
 * 2. Valid SUPER_ADMIN user in database
 * 3. Some commission data in database (can be created via bookings)
 * 
 * Usage:
 *   node test-super-admin-commissions.js
 */

const API_URL = process.env.API_URL || 'http://localhost:5001';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Password123!';

let authToken = null;
let testCommissionId = null;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Make API request
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  });

  const data = await response.json();
  return { status: response.status, data };
}

/**
 * Login and get auth token
 */
async function login() {
  console.log('\n🔐 Step 1: Login as Super Admin');
  console.log('=' .repeat(60));

  const { status, data } = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
    }),
  });

  if (status === 200 && data.success) {
    authToken = data.token;
    console.log('✅ Login successful');
    console.log(`   User: ${data.user.name} (${data.user.role})`);
    return true;
  } else {
    console.error('❌ Login failed:', data.error);
    return false;
  }
}

/**
 * Test GET /api/super-admin/commissions (list with filters)
 */
async function testGetAllCommissions() {
  console.log('\n📋 Step 2: Get All Commissions (default params)');
  console.log('=' .repeat(60));

  const { status, data } = await apiRequest('/api/super-admin/commissions');

  if (status === 200 && data.success) {
    console.log('✅ Request successful');
    console.log(`   Total: ${data.data.meta.total}`);
    console.log(`   Page: ${data.data.meta.page}/${data.data.meta.totalPages}`);
    console.log(`   Items: ${data.data.items.length}`);
    console.log(`   Date Range: ${data.data.range.from} to ${data.data.range.to}`);
    console.log('\n   Aggregates:');
    console.log(`     - Pending: ${data.data.aggregates.pendingCount} (${(data.data.aggregates.pendingAmountCents / 100).toFixed(2)} USD)`);
    console.log(`     - Paid: ${data.data.aggregates.paidCount} (${(data.data.aggregates.paidAmountCents / 100).toFixed(2)} USD)`);
    console.log(`     - Total: ${(data.data.aggregates.totalAmountCents / 100).toFixed(2)} USD`);

    if (data.data.items.length > 0) {
      const first = data.data.items[0];
      testCommissionId = first.id;
      console.log('\n   First Commission:');
      console.log(`     - ID: ${first.id}`);
      console.log(`     - Status: ${first.status}`);
      console.log(`     - Amount: ${(first.amount / 100).toFixed(2)} USD`);
      console.log(`     - Agent: ${first.agent?.name || 'N/A'} (${first.agent?.email || 'N/A'})`);
      console.log(`     - Booking ID: ${first.bookingId || 'N/A'}`);
    }

    return true;
  } else {
    console.error('❌ Request failed:', data.error);
    return false;
  }
}

/**
 * Test GET /api/super-admin/commissions with filters
 */
async function testGetCommissionsWithFilters() {
  console.log('\n🔍 Step 3: Get Commissions with Filters');
  console.log('=' .repeat(60));

  // Test with date range
  const { status, data } = await apiRequest(
    '/api/super-admin/commissions?from=2026-01-01&to=2026-12-31&status=UNPAID&page=1&limit=5'
  );

  if (status === 200 && data.success) {
    console.log('✅ Filtered request successful');
    console.log(`   Filters: from=2026-01-01, to=2026-12-31, status=UNPAID`);
    console.log(`   Total: ${data.data.meta.total}`);
    console.log(`   Items returned: ${data.data.items.length}`);
    return true;
  } else {
    console.error('❌ Request failed:', data.error);
    return false;
  }
}

/**
 * Test GET /api/super-admin/commissions/:id
 */
async function testGetCommissionById() {
  if (!testCommissionId) {
    console.log('\n⚠️  Step 4: Get Commission By ID - SKIPPED (no commission ID)');
    return true;
  }

  console.log('\n📄 Step 4: Get Commission By ID');
  console.log('=' .repeat(60));

  const { status, data } = await apiRequest(`/api/super-admin/commissions/${testCommissionId}`);

  if (status === 200 && data.success) {
    console.log('✅ Request successful');
    console.log(`   ID: ${data.data.id}`);
    console.log(`   Status: ${data.data.status}`);
    console.log(`   Amount: ${(data.data.amount / 100).toFixed(2)} USD`);
    console.log(`   Created: ${data.data.createdAt}`);
    console.log(`   Agent: ${data.data.agent?.name || 'N/A'} (${data.data.agent?.email || 'N/A'})`);
    if (data.data.booking) {
      console.log(`   Booking: ${data.data.booking.id} - ${data.data.booking.customerName}`);
      console.log(`     Check-in: ${data.data.booking.checkInDate}`);
      console.log(`     Total: ${(data.data.booking.totalAmount / 100).toFixed(2)} USD`);
    }
    return true;
  } else {
    console.error('❌ Request failed:', data.error);
    return false;
  }
}

/**
 * Test POST /api/super-admin/commissions/:id/mark-paid
 */
async function testMarkCommissionAsPaid() {
  if (!testCommissionId) {
    console.log('\n⚠️  Step 5: Mark Commission as Paid - SKIPPED (no commission ID)');
    return true;
  }

  console.log('\n💰 Step 5: Mark Commission as Paid');
  console.log('=' .repeat(60));

  const { status, data } = await apiRequest(
    `/api/super-admin/commissions/${testCommissionId}/mark-paid`,
    {
      method: 'POST',
      body: JSON.stringify({
        paidAt: new Date().toISOString(),
        note: 'Test payment via API',
        paymentMethod: 'TRANSFER',
        reference: 'TEST-TXN-12345',
      }),
    }
  );

  if (status === 200 && data.success) {
    console.log('✅ Commission marked as paid');
    console.log(`   ID: ${data.data.id}`);
    console.log(`   New Status: ${data.data.status}`);
    console.log(`   Message: ${data.message}`);
    return true;
  } else if (status === 200 && !data.success) {
    console.log('ℹ️  Commission already paid (idempotent operation)');
    return true;
  } else {
    console.error('❌ Request failed:', data.error);
    return false;
  }
}

/**
 * Test POST /api/super-admin/commissions/:id/mark-unpaid
 */
async function testMarkCommissionAsUnpaid() {
  if (!testCommissionId) {
    console.log('\n⚠️  Step 6: Mark Commission as Unpaid - SKIPPED (no commission ID)');
    return true;
  }

  console.log('\n🔄 Step 6: Mark Commission as Unpaid');
  console.log('=' .repeat(60));

  const { status, data } = await apiRequest(
    `/api/super-admin/commissions/${testCommissionId}/mark-unpaid`,
    {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Test reversal via API',
      }),
    }
  );

  if (status === 200 && data.success) {
    console.log('✅ Commission marked as unpaid');
    console.log(`   ID: ${data.data.id}`);
    console.log(`   New Status: ${data.data.status}`);
    console.log(`   Message: ${data.message}`);
    return true;
  } else {
    console.error('❌ Request failed:', data.error);
    console.log('   Note: This may fail if commission was not PAID first');
    return false;
  }
}

/**
 * Test search functionality
 */
async function testSearchCommissions() {
  console.log('\n🔎 Step 7: Search Commissions');
  console.log('=' .repeat(60));

  const { status, data } = await apiRequest(
    '/api/super-admin/commissions?search=agent&page=1&limit=5'
  );

  if (status === 200 && data.success) {
    console.log('✅ Search request successful');
    console.log(`   Search term: "agent"`);
    console.log(`   Results: ${data.data.items.length}`);
    return true;
  } else {
    console.error('❌ Request failed:', data.error);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  SUPER ADMIN COMMISSIONS API TEST SUITE');
  console.log('═'.repeat(60));
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Super Admin: ${SUPER_ADMIN_EMAIL}`);
  console.log('═'.repeat(60));

  try {
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      throw new Error('Login failed');
    }

    // Step 2: Test list all commissions
    await testGetAllCommissions();

    // Step 3: Test with filters
    await testGetCommissionsWithFilters();

    // Step 4: Test get by ID
    await testGetCommissionById();

    // Step 5: Test mark as paid
    await testMarkCommissionAsPaid();

    // Step 6: Test mark as unpaid
    await testMarkCommissionAsUnpaid();

    // Step 7: Test search
    await testSearchCommissions();

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('  ✅ ALL TESTS COMPLETED');
    console.log('═'.repeat(60));
    console.log('\n');

  } catch (error) {
    console.error('\n');
    console.error('═'.repeat(60));
    console.error('  ❌ TEST SUITE FAILED');
    console.error('═'.repeat(60));
    console.error('  Error:', error.message);
    console.error('\n');
    process.exit(1);
  }
}

// Run tests
runTests();
