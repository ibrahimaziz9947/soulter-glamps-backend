/**
 * Test script for Admin Quick Actions APIs
 * Tests:
 * 1. POST /api/admin/bookings - Create booking
 * 2. POST /api/glamps - Create glamp
 * 3. POST /api/admin/staff - Create staff member
 * 
 * Usage: node test-admin-quick-actions.js
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

  console.log('✅ Admin login successful\n');
  return data.token;
}

// ============================================
// Test 1: Create Booking
// ============================================
async function testCreateBooking(token) {
  console.log('📊 TEST 1: Create Admin Booking');
  console.log('POST /api/admin/bookings\n');

  // Get an active glamp first
  const glampsResponse = await fetch(`${BASE_URL}/api/glamps?status=ACTIVE`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const glampsData = await glampsResponse.json();
  
  if (!glampsData.data || glampsData.data.length === 0) {
    console.log('⚠️  No active glamps found. Skipping booking test.');
    return false;
  }

  const glamp = glampsData.data[0];
  console.log(`Using glamp: ${glamp.name} (${glamp.id})\n`);

  const bookingPayload = {
    glampId: glamp.id,
    checkInDate: '2026-02-01',
    checkOutDate: '2026-02-05',
    adults: 2,
    children: 1,
    guest: {
      fullName: 'Test Customer',
      email: 'testcustomer@example.com',
      phone: '+92-300-1234567',
      specialRequests: 'Late check-in preferred'
    },
    addOns: [
      {
        code: 'BREAKFAST',
        name: 'Breakfast Package',
        priceCents: 50000, // 500 PKR
        qty: 4 // 4 days
      }
    ],
    paymentStatus: 'PENDING'
  };

  console.log('Request payload:');
  console.log(JSON.stringify(bookingPayload, null, 2));
  console.log();

  const response = await fetch(`${BASE_URL}/api/admin/bookings`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingPayload),
  });

  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:');
  console.log(JSON.stringify(data, null, 2));
  console.log();

  if (!data.success) {
    console.log('❌ Test 1 failed\n');
    return false;
  }

  console.log('✅ Test 1 passed');
  console.log(`Booking ID: ${data.data.id}`);
  console.log(`Total: ${data.data.totals.totalAmountCents} cents (${(data.data.totals.totalAmountCents / 100).toFixed(2)} PKR)`);
  console.log();

  return true;
}

// ============================================
// Test 2: Create Glamp
// ============================================
async function testCreateGlamp(token) {
  console.log('📊 TEST 2: Create Glamp');
  console.log('POST /api/glamps\n');

  const glampPayload = {
    name: `Test Glamp ${Date.now()}`,
    description: 'A beautiful luxury glamping unit for testing',
    pricePerNightCents: 1500000, // 15,000 PKR
    maxGuests: 4,
    capacity: 4, // Alternative field
    amenities: ['WiFi', 'Air Conditioning', 'Private Bathroom', 'Mountain View'],
    features: ['Queen Bed', 'Sofa', 'Mini Fridge'],
    status: 'ACTIVE',
    saveAsDraft: false
  };

  console.log('Request payload:');
  console.log(JSON.stringify(glampPayload, null, 2));
  console.log();

  const response = await fetch(`${BASE_URL}/api/glamps`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(glampPayload),
  });

  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:');
  console.log(JSON.stringify(data, null, 2));
  console.log();

  if (!data.success) {
    console.log('❌ Test 2 failed\n');
    return false;
  }

  console.log('✅ Test 2 passed');
  console.log(`Glamp ID: ${data.data.id}`);
  console.log(`Price: ${data.data.pricePerNight} cents (${(data.data.pricePerNight / 100).toFixed(2)} PKR/night)`);
  console.log();

  return true;
}

// ============================================
// Test 3: Create Staff Member
// ============================================
async function testCreateStaff(token) {
  console.log('📊 TEST 3: Create Staff Member');
  console.log('POST /api/admin/staff\n');

  const staffPayload = {
    fullName: `Test Admin ${Date.now()}`,
    email: `testadmin${Date.now()}@soulter.com`,
    phone: '+92-300-9876543',
    role: 'ADMIN',
    // password not provided - will be auto-generated
  };

  console.log('Request payload:');
  console.log(JSON.stringify(staffPayload, null, 2));
  console.log();

  const response = await fetch(`${BASE_URL}/api/admin/staff`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(staffPayload),
  });

  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:');
  console.log(JSON.stringify(data, null, 2));
  console.log();

  if (!data.success) {
    console.log('❌ Test 3 failed\n');
    return false;
  }

  console.log('✅ Test 3 passed');
  console.log(`Staff ID: ${data.data.user.id}`);
  console.log(`Email: ${data.data.user.email}`);
  console.log(`Role: ${data.data.user.role}`);
  
  if (data.data.tempPassword) {
    console.log(`⚠️  Temporary Password: ${data.data.tempPassword}`);
    console.log('    (This should be sent to the user securely)');
  }
  console.log();

  return true;
}

// ============================================
// Main Test Runner
// ============================================
async function runTests() {
  console.log('========================================');
  console.log('🧪 Admin Quick Actions API Tests');
  console.log('========================================\n');

  try {
    const token = await loginAsAdmin();

    const test1 = await testCreateBooking(token);
    const test2 = await testCreateGlamp(token);
    const test3 = await testCreateStaff(token);

    console.log('========================================');
    console.log('📊 Test Summary:');
    console.log(`  Test 1 (Create Booking): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Test 2 (Create Glamp): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Test 3 (Create Staff): ${test3 ? '✅ PASS' : '❌ FAIL'}`);
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
