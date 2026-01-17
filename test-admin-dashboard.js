/**
 * Test script for Admin Dashboard Summary endpoint
 * 
 * Tests:
 * 1. GET /api/admin/dashboard/summary (default 30 days)
 * 2. GET /api/admin/dashboard/summary?from=2026-01-01&to=2026-01-31 (custom range)
 * 3. GET /api/admin/dashboard/summary?from=2026-01-01 (from only)
 * 
 * Usage: node test-admin-dashboard.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

// ============================================
// Helper: Login as Admin
// ============================================
async function loginAsAdmin() {
  console.log('🔐 Logging in as admin...');
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@soulter.com',
      password: 'admin123',
    }),
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Admin login failed: ' + JSON.stringify(data));
  }

  console.log('✅ Admin login successful');
  return data.token;
}

// ============================================
// Test 1: Default 30-day summary
// ============================================
async function testDefaultSummary(token) {
  console.log('\n📊 TEST 1: Default 30-day summary');
  console.log('GET /api/admin/dashboard/summary');

  const response = await fetch(`${BASE_URL}/api/admin/dashboard/summary`, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (!data.success) {
    console.log('❌ Test failed');
    return false;
  }

  // Validate response structure
  const { totalBookings, revenueCents, occupancyRatePercent, activeStaff } = data.data;
  
  console.log('\n📈 KPI Breakdown:');
  console.log(`  Total Bookings: ${totalBookings}`);
  console.log(`  Revenue: ${revenueCents} cents (${(revenueCents / 100).toFixed(2)} PKR)`);
  console.log(`  Occupancy Rate: ${occupancyRatePercent}%`);
  console.log(`  Active Staff: ${activeStaff}`);

  console.log('✅ Test 1 passed');
  return true;
}

// ============================================
// Test 2: Custom date range
// ============================================
async function testCustomRangeSummary(token) {
  console.log('\n📊 TEST 2: Custom date range (Jan 1-17, 2026)');
  console.log('GET /api/admin/dashboard/summary?from=2026-01-01&to=2026-01-17');

  const response = await fetch(
    `${BASE_URL}/api/admin/dashboard/summary?from=2026-01-01&to=2026-01-17`,
    {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (!data.success) {
    console.log('❌ Test failed');
    return false;
  }

  // Validate response structure
  const { totalBookings, revenueCents, occupancyRatePercent, activeStaff } = data.data;
  
  console.log('\n📈 KPI Breakdown (Jan 1-17):');
  console.log(`  Total Bookings: ${totalBookings}`);
  console.log(`  Revenue: ${revenueCents} cents (${(revenueCents / 100).toFixed(2)} PKR)`);
  console.log(`  Occupancy Rate: ${occupancyRatePercent}%`);
  console.log(`  Active Staff: ${activeStaff}`);

  console.log('✅ Test 2 passed');
  return true;
}

// ============================================
// Test 3: From date only
// ============================================
async function testFromOnlySummary(token) {
  console.log('\n📊 TEST 3: From date only (from 2026-01-01 to now)');
  console.log('GET /api/admin/dashboard/summary?from=2026-01-01');

  const response = await fetch(
    `${BASE_URL}/api/admin/dashboard/summary?from=2026-01-01`,
    {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (!data.success) {
    console.log('❌ Test failed');
    return false;
  }

  const { totalBookings, revenueCents, occupancyRatePercent, activeStaff } = data.data;
  
  console.log('\n📈 KPI Breakdown (from 2026-01-01):');
  console.log(`  Total Bookings: ${totalBookings}`);
  console.log(`  Revenue: ${revenueCents} cents (${(revenueCents / 100).toFixed(2)} PKR)`);
  console.log(`  Occupancy Rate: ${occupancyRatePercent}%`);
  console.log(`  Active Staff: ${activeStaff}`);

  console.log('✅ Test 3 passed');
  return true;
}

// ============================================
// Main Test Runner
// ============================================
async function runTests() {
  console.log('========================================');
  console.log('🧪 Admin Dashboard Summary API Tests');
  console.log('========================================');

  try {
    const token = await loginAsAdmin();

    const test1 = await testDefaultSummary(token);
    const test2 = await testCustomRangeSummary(token);
    const test3 = await testFromOnlySummary(token);

    console.log('\n========================================');
    console.log('📊 Test Summary:');
    console.log(`  Test 1 (Default 30 days): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Test 2 (Custom range): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Test 3 (From only): ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('========================================');

    const allPassed = test1 && test2 && test3;
    if (allPassed) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n❌ Some tests failed');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error);
  }
}

runTests();
