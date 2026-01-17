#!/usr/bin/env node

/**
 * Debug Test Script for Super Admin Bookings API
 * Tests the exact date range showing 33 bookings in dashboard
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001';
const TOKEN = process.env.SUPER_ADMIN_TOKEN;

if (!TOKEN) {
  console.error('❌ Error: SUPER_ADMIN_TOKEN required');
  console.log('Set it with: export SUPER_ADMIN_TOKEN="your-token"');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

async function testBookingsAPI() {
  console.log('\n🔍 DEBUGGING SUPER ADMIN BOOKINGS API');
  console.log('='.repeat(60));

  // Test 1: Exact date range from user report
  console.log('\n📅 Test 1: Exact date range (2025-12-18 to 2026-01-17)');
  console.log('Expected: 33 bookings (same as dashboard)');

  const from = '2025-12-18';
  const to = '2026-01-17';
  const url = `${BASE_URL}/api/super-admin/bookings?from=${from}&to=${to}&page=1&limit=20`;

  console.log(`\nRequest URL: ${url}`);

  try {
    const response = await fetch(url, { headers });
    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}:`, data);
      return;
    }

    console.log('\n✅ Response received successfully');
    console.log('\nRESPONSE STRUCTURE:');
    console.log('  success:', data.success);
    console.log('  data.items.length:', data.data.items.length);
    console.log('  data.meta.total:', data.data.meta.total);
    console.log('  data.meta.page:', data.data.meta.page);
    console.log('  data.meta.limit:', data.data.meta.limit);
    console.log('  data.meta.totalPages:', data.data.meta.totalPages);
    console.log('  data.range.from:', data.data.range.from);
    console.log('  data.range.to:', data.data.range.to);

    if (data.data.aggregates) {
      console.log('\n📊 AGGREGATES:');
      console.log('  totalBookings:', data.data.aggregates.totalBookings);
      console.log('  confirmedCount:', data.data.aggregates.confirmedCount);
      console.log('  pendingCount:', data.data.aggregates.pendingCount);
      console.log('  cancelledCount:', data.data.aggregates.cancelledCount);
      console.log('  completedCount:', data.data.aggregates.completedCount);
      console.log('  revenueCents:', data.data.aggregates.revenueCents);
    }

    if (data.data.items.length > 0) {
      console.log('\n📋 FIRST BOOKING ITEM:');
      const first = data.data.items[0];
      console.log('  id:', first.id);
      console.log('  createdAt:', first.createdAt);
      console.log('  status:', first.status);
      console.log('  customerName:', first.customerName);
      console.log('  glampName:', first.glampName);
      console.log('  totalAmountCents:', first.totalAmountCents);
      console.log('  agentId:', first.agentId);
      console.log('  checkInDate:', first.checkInDate);
      console.log('  checkOutDate:', first.checkOutDate);
      console.log('  guests:', first.guests);
    } else {
      console.log('\n⚠️  NO BOOKINGS FOUND!');
      console.log('This is the bug - dashboard shows 33 but API returns 0');
    }

    // Compare with dashboard
    if (data.data.meta.total === 33) {
      console.log('\n✅ SUCCESS: Total matches dashboard (33)');
    } else if (data.data.meta.total === 0) {
      console.log('\n❌ BUG CONFIRMED: API returns 0 but dashboard shows 33');
    } else {
      console.log(`\n⚠️  MISMATCH: API shows ${data.data.meta.total} but dashboard shows 33`);
    }

    // Test 2: Default params
    console.log('\n\n📅 Test 2: Default params (last 30 days)');
    const response2 = await fetch(`${BASE_URL}/api/super-admin/bookings`, { headers });
    const data2 = await response2.json();
    console.log('✅ Total:', data2.data.meta.total);
    console.log('Items returned:', data2.data.items.length);
    console.log('Range:', data2.data.range.from, 'to', data2.data.range.to);

    // Test 3: CONFIRMED status
    console.log('\n\n📅 Test 3: Filter by CONFIRMED status');
    const response3 = await fetch(`${BASE_URL}/api/super-admin/bookings?from=${from}&to=${to}&status=CONFIRMED`, { headers });
    const data3 = await response3.json();
    console.log('✅ Confirmed bookings:', data3.data.meta.total);

    // Test 4: ALL status
    console.log('\n\n📅 Test 4: Filter by ALL status (should return all)');
    const response4 = await fetch(`${BASE_URL}/api/super-admin/bookings?from=${from}&to=${to}&status=ALL`, { headers });
    const data4 = await response4.json();
    console.log('✅ Total with \'ALL\' status:', data4.data.meta.total);
    if (data4.data.meta.total === data.data.meta.total) {
      console.log('✅ Correctly ignores \'ALL\' status filter');
    } else {
      console.log('⚠️  \'ALL\' filter behavior different');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Testing complete');
    console.log('\nCheck server console for detailed debug logs with:');
    console.log('  [SUPER ADMIN BOOKINGS] prefix');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  }
}

testBookingsAPI();
