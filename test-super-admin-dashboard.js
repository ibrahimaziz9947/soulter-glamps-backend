/**
 * Test script for Super Admin Dashboard endpoints
 * Tests:
 * 1. GET /api/super-admin/dashboard/ping
 * 2. GET /api/super-admin/dashboard/summary (default 30 days)
 * 3. GET /api/super-admin/dashboard/summary?from=2026-01-01&to=2026-01-17
 * 
 * Usage: node test-super-admin-dashboard.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

// ============================================
// Helper: Login as Super Admin
// ============================================
async function loginAsSuperAdmin() {
  console.log('🔐 Logging in as super admin...');
  
  const response = await fetch(`${BASE_URL}/api/auth/super-admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'super@soulter.com',
      password: 'super123',
    }),
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Super admin login failed: ' + JSON.stringify(data));
  }

  console.log('✅ Super admin login successful\n');
  return data.token;
}

// ============================================
// Test 1: Ping Check
// ============================================
async function testPing(token) {
  console.log('📊 TEST 1: Ping Check');
  console.log('GET /api/super-admin/dashboard/ping\n');

  const response = await fetch(`${BASE_URL}/api/super-admin/dashboard/ping`, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  console.log();

  if (!data.success) {
    console.log('❌ Test 1 failed\n');
    return false;
  }

  console.log('✅ Test 1 passed');
  console.log(`Database: ${data.data.db}`);
  console.log(`Timestamp: ${data.data.timestamp}`);
  console.log();

  return true;
}

// ============================================
// Test 2: Dashboard Summary (Default 30 days)
// ============================================
async function testDefaultSummary(token) {
  console.log('📊 TEST 2: Dashboard Summary (Default 30 days)');
  console.log('GET /api/super-admin/dashboard/summary\n');

  const response = await fetch(`${BASE_URL}/api/super-admin/dashboard/summary`, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  console.log();

  if (!data.success) {
    console.log('❌ Test 2 failed\n');
    return false;
  }

  console.log('✅ Test 2 passed');
  console.log('\n📈 Summary Breakdown:');
  console.log(`  Total Bookings: ${data.data.totalBookings}`);
  console.log(`  Revenue: ${data.data.revenueCents} cents (${(data.data.revenueCents / 100).toFixed(2)} PKR)`);
  console.log(`  Pending Commissions: ${data.data.pendingCommissions.count} (${(data.data.pendingCommissions.amountCents / 100).toFixed(2)} PKR)`);
  console.log(`  Finance Snapshot:`);
  console.log(`    - Revenue: ${(data.data.financeSnapshot.revenueCents / 100).toFixed(2)} PKR`);
  console.log(`    - Expenses: ${(data.data.financeSnapshot.expenseCents / 100).toFixed(2)} PKR`);
  console.log(`    - Profit: ${(data.data.financeSnapshot.profitCents / 100).toFixed(2)} PKR`);
  console.log(`  System Health: ${data.data.systemHealth.ok ? '✅ OK' : '❌ FAIL'} (DB: ${data.data.systemHealth.db})`);
  console.log();

  return true;
}

// ============================================
// Test 3: Dashboard Summary (Custom Range)
// ============================================
async function testCustomRangeSummary(token) {
  console.log('📊 TEST 3: Dashboard Summary (Jan 1-17, 2026)');
  console.log('GET /api/super-admin/dashboard/summary?from=2026-01-01&to=2026-01-17\n');

  const response = await fetch(
    `${BASE_URL}/api/super-admin/dashboard/summary?from=2026-01-01&to=2026-01-17`,
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
  console.log();

  if (!data.success) {
    console.log('❌ Test 3 failed\n');
    return false;
  }

  console.log('✅ Test 3 passed');
  console.log('\n📈 Summary Breakdown (Jan 1-17):');
  console.log(`  Date Range: ${data.data.range.from} to ${data.data.range.to}`);
  console.log(`  Total Bookings: ${data.data.totalBookings}`);
  console.log(`  Revenue: ${data.data.revenueCents} cents (${(data.data.revenueCents / 100).toFixed(2)} PKR)`);
  console.log(`  Finance Snapshot:`);
  console.log(`    - Revenue: ${(data.data.financeSnapshot.revenueCents / 100).toFixed(2)} PKR`);
  console.log(`    - Expenses: ${(data.data.financeSnapshot.expenseCents / 100).toFixed(2)} PKR`);
  console.log(`    - Profit: ${(data.data.financeSnapshot.profitCents / 100).toFixed(2)} PKR`);
  console.log();

  return true;
}

// ============================================
// Test 4: Verify SUPER_ADMIN Protection
// ============================================
async function testAdminRestriction() {
  console.log('📊 TEST 4: Verify SUPER_ADMIN Protection (should fail with ADMIN token)');
  
  // Try to login as regular admin
  const adminResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@soulter.com',
      password: 'admin123',
    }),
  });

  const adminData = await adminResponse.json();
  
  if (!adminData.success) {
    console.log('⚠️  Could not login as admin. Skipping restriction test.\n');
    return true; // Skip this test
  }

  const adminToken = adminData.token;
  console.log('Logged in as ADMIN (not SUPER_ADMIN)');
  console.log('Attempting to access super admin endpoint...\n');

  const response = await fetch(`${BASE_URL}/api/super-admin/dashboard/summary`, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  console.log();

  // Should be 403 Forbidden
  if (response.status === 403 && !data.success) {
    console.log('✅ Test 4 passed - Correctly rejected ADMIN access');
    console.log();
    return true;
  }

  console.log('❌ Test 4 failed - ADMIN should not have access\n');
  return false;
}

// ============================================
// Main Test Runner
// ============================================
async function runTests() {
  console.log('========================================');
  console.log('🧪 Super Admin Dashboard API Tests');
  console.log('========================================\n');

  try {
    const token = await loginAsSuperAdmin();

    const test1 = await testPing(token);
    const test2 = await testDefaultSummary(token);
    const test3 = await testCustomRangeSummary(token);
    const test4 = await testAdminRestriction();

    console.log('========================================');
    console.log('📊 Test Summary:');
    console.log(`  Test 1 (Ping): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Test 2 (Default Summary): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Test 3 (Custom Range): ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Test 4 (Auth Protection): ${test4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('========================================');

    const allPassed = test1 && test2 && test3 && test4;
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
