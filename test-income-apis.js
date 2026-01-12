/**
 * Test Income APIs
 * Tests all income endpoints with proper validation and role-based access
 */

const BASE_URL = 'http://localhost:5001';

// Helper function to make requests
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

// Test data
let adminToken = null;
let testBookingId = null;
let testIncomeId = null;
let manualIncomeId = null;

// Step 1: Login as ADMIN
async function loginAsAdmin() {
  console.log('\n🔐 Step 1: Login as ADMIN');
  const { status, data } = await request('/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@soulter.com',
      password: 'admin123',
    }),
  });
  
  if (status === 200 && data.token) {
    adminToken = data.token;
    console.log('✅ Admin login successful');
    console.log('   Token:', adminToken.substring(0, 20) + '...');
  } else {
    console.log('❌ Admin login failed:', data);
    process.exit(1);
  }
}

// Step 2: Get a test booking ID
async function getTestBookingId() {
  console.log('\n📋 Step 2: Get test booking ID');
  const { status, data } = await request('/api/bookings?limit=1', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.data && data.data.length > 0) {
    testBookingId = data.data[0].id;
    console.log('✅ Test booking found:', testBookingId);
  } else {
    console.log('⚠️  No bookings found, will test MANUAL income only');
  }
}

// Step 3: Create MANUAL income (success)
async function testCreateManualIncome() {
  console.log('\n✅ Step 3: Create MANUAL income (should succeed)');
  const { status, data } = await request('/api/finance/income', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 25000, // $250.00
      currency: 'USD',
      dateReceived: new Date().toISOString(),
      source: 'MANUAL',
      status: 'CONFIRMED',
      reference: 'TEST-MANUAL-001',
      notes: 'Test manual income entry',
    }),
  });
  
  if (status === 201 && data.success) {
    manualIncomeId = data.data.id;
    console.log('✅ Manual income created successfully');
    console.log('   ID:', manualIncomeId);
    console.log('   Amount:', data.data.amount, 'cents');
    console.log('   Source:', data.data.source);
    console.log('   Status:', data.data.status);
  } else {
    console.log('❌ Manual income creation failed:', data);
  }
}

// Step 4: Create BOOKING income without bookingId (should fail)
async function testCreateBookingIncomeWithoutBookingId() {
  console.log('\n❌ Step 4: Create BOOKING income WITHOUT bookingId (should fail)');
  const { status, data } = await request('/api/finance/income', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 50000,
      currency: 'USD',
      source: 'BOOKING',
      // Missing bookingId
    }),
  });
  
  if (status === 400 && !data.success) {
    console.log('✅ Correctly rejected (400)');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 400:', status, data);
  }
}

// Step 5: Create BOOKING income with invalid bookingId (should fail)
async function testCreateBookingIncomeWithInvalidBookingId() {
  console.log('\n❌ Step 5: Create BOOKING income with INVALID bookingId (should fail)');
  const { status, data } = await request('/api/finance/income', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 50000,
      currency: 'USD',
      source: 'BOOKING',
      bookingId: '00000000-0000-0000-0000-000000000000', // Invalid ID
    }),
  });
  
  if (status === 404 && !data.success) {
    console.log('✅ Correctly rejected (404)');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 404:', status, data);
  }
}

// Step 6: Create BOOKING income with valid bookingId (if available)
async function testCreateBookingIncome() {
  if (!testBookingId) {
    console.log('\n⏭️  Step 6: Skipped (no booking available)');
    return;
  }
  
  console.log('\n✅ Step 6: Create BOOKING income with valid bookingId (should succeed)');
  const { status, data } = await request('/api/finance/income', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 75000, // $750.00
      currency: 'USD',
      dateReceived: new Date().toISOString(),
      source: 'BOOKING',
      status: 'CONFIRMED',
      bookingId: testBookingId,
      reference: 'TEST-BOOKING-001',
      notes: 'Payment received for booking',
    }),
  });
  
  if (status === 201 && data.success) {
    testIncomeId = data.data.id;
    console.log('✅ Booking income created successfully');
    console.log('   ID:', testIncomeId);
    console.log('   Amount:', data.data.amount, 'cents');
    console.log('   Booking ID:', data.data.bookingId);
    console.log('   Booking Info:', data.data.booking?.customerName || 'N/A');
  } else {
    console.log('❌ Booking income creation failed:', data);
  }
}

// Step 7: List income (should see created records)
async function testListIncome() {
  console.log('\n📋 Step 7: List all income records');
  const { status, data } = await request('/api/finance/income?page=1&limit=10', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Income list retrieved');
    console.log('   Total records:', data.pagination.total);
    console.log('   Page:', data.pagination.page);
    console.log('   Total amount:', data.summary.totalAmount, 'cents');
    console.log('   Records:');
    data.data.slice(0, 3).forEach(income => {
      console.log(`   - ${income.source}: $${(income.amount / 100).toFixed(2)} (${income.status})`);
    });
  } else {
    console.log('❌ Failed to list income:', data);
  }
}

// Step 8: Get income by ID
async function testGetIncomeById() {
  if (!manualIncomeId) {
    console.log('\n⏭️  Step 8: Skipped (no income ID available)');
    return;
  }
  
  console.log('\n🔍 Step 8: Get income by ID');
  const { status, data } = await request(`/api/finance/income/${manualIncomeId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Income retrieved');
    console.log('   ID:', data.data.id);
    console.log('   Amount:', data.data.amount, 'cents');
    console.log('   Source:', data.data.source);
    console.log('   Reference:', data.data.reference);
    console.log('   Created by:', data.data.createdBy?.name || 'N/A');
  } else {
    console.log('❌ Failed to get income:', data);
  }
}

// Step 9: Update income
async function testUpdateIncome() {
  if (!manualIncomeId) {
    console.log('\n⏭️  Step 9: Skipped (no income ID available)');
    return;
  }
  
  console.log('\n✏️  Step 9: Update income');
  const { status, data } = await request(`/api/finance/income/${manualIncomeId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 30000, // Updated to $300.00
      notes: 'Updated test manual income entry',
    }),
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Income updated successfully');
    console.log('   New amount:', data.data.amount, 'cents');
    console.log('   New notes:', data.data.notes);
    console.log('   Updated by:', data.data.updatedBy?.name || 'N/A');
  } else {
    console.log('❌ Failed to update income:', data);
  }
}

// Step 10: Get summary
async function testGetSummary() {
  console.log('\n📊 Step 10: Get income summary');
  const { status, data } = await request('/api/finance/income/summary', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Summary retrieved');
    console.log('   Total count:', data.data.totalCount);
    console.log('   Total amount:', data.data.totalAmountCents, 'cents ($' + (data.data.totalAmountCents / 100).toFixed(2) + ')');
    console.log('   By Source:', JSON.stringify(data.data.bySource, null, 2));
    console.log('   By Status:', JSON.stringify(data.data.byStatus, null, 2));
  } else {
    console.log('❌ Failed to get summary:', data);
  }
}

// Step 11: Soft delete income
async function testSoftDeleteIncome() {
  if (!manualIncomeId) {
    console.log('\n⏭️  Step 11: Skipped (no income ID available)');
    return;
  }
  
  console.log('\n🗑️  Step 11: Soft delete income');
  const { status, data } = await request(`/api/finance/income/${manualIncomeId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Income soft deleted');
    console.log('   Message:', data.message);
  } else {
    console.log('❌ Failed to delete income:', data);
  }
}

// Step 12: Verify soft delete (should not appear in list)
async function testVerifySoftDelete() {
  if (!manualIncomeId) {
    console.log('\n⏭️  Step 12: Skipped (no income ID available)');
    return;
  }
  
  console.log('\n🔍 Step 12: Verify income is hidden from list');
  const { status, data } = await request('/api/finance/income', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    const found = data.data.find(income => income.id === manualIncomeId);
    if (!found) {
      console.log('✅ Income correctly hidden from list');
    } else {
      console.log('❌ Income still appears in list (should be hidden)');
    }
  } else {
    console.log('❌ Failed to list income:', data);
  }
}

// Step 13: Get deleted income by ID (should return 404)
async function testGetDeletedIncome() {
  if (!manualIncomeId) {
    console.log('\n⏭️  Step 13: Skipped (no income ID available)');
    return;
  }
  
  console.log('\n🔍 Step 13: Try to get deleted income by ID (should fail)');
  const { status, data } = await request(`/api/finance/income/${manualIncomeId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 404 && !data.success) {
    console.log('✅ Correctly returns 404 for deleted income');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have returned 404:', status, data);
  }
}

// Step 14: Restore income
async function testRestoreIncome() {
  if (!manualIncomeId) {
    console.log('\n⏭️  Step 14: Skipped (no income ID available)');
    return;
  }
  
  console.log('\n♻️  Step 14: Restore deleted income');
  const { status, data } = await request(`/api/finance/income/${manualIncomeId}/restore`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Income restored successfully');
    console.log('   Message:', data.message);
    console.log('   Deleted at:', data.data.deletedAt);
  } else {
    console.log('❌ Failed to restore income:', data);
  }
}

// Step 15: Verify restore (should appear in list again)
async function testVerifyRestore() {
  if (!manualIncomeId) {
    console.log('\n⏭️  Step 15: Skipped (no income ID available)');
    return;
  }
  
  console.log('\n🔍 Step 15: Verify income is back in list');
  const { status, data } = await request('/api/finance/income', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    const found = data.data.find(income => income.id === manualIncomeId);
    if (found) {
      console.log('✅ Income correctly appears in list again');
      console.log('   Amount:', found.amount, 'cents');
    } else {
      console.log('❌ Income not found in list (should be restored)');
    }
  } else {
    console.log('❌ Failed to list income:', data);
  }
}

// Step 16: Test validation - invalid amount
async function testInvalidAmount() {
  console.log('\n❌ Step 16: Create income with invalid amount (should fail)');
  const { status, data } = await request('/api/finance/income', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: -1000, // Negative amount
      currency: 'USD',
      source: 'MANUAL',
    }),
  });
  
  if (status === 400 && !data.success) {
    console.log('✅ Correctly rejected negative amount');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 400:', status, data);
  }
}

// Step 17: Test validation - invalid currency
async function testInvalidCurrency() {
  console.log('\n❌ Step 17: Create income with invalid currency (should fail)');
  const { status, data } = await request('/api/finance/income', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 10000,
      currency: 'US', // Only 2 characters instead of 3
      source: 'MANUAL',
    }),
  });
  
  if (status === 400 && !data.success) {
    console.log('✅ Correctly rejected invalid currency');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 400:', status, data);
  }
}

// Step 18: Test unauthorized access
async function testUnauthorizedAccess() {
  console.log('\n🔒 Step 18: Try to access without token (should fail)');
  const { status, data } = await request('/api/finance/income', {
    method: 'GET',
  });
  
  if (status === 401 && !data.success) {
    console.log('✅ Correctly rejected unauthorized access');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 401:', status, data);
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n🧪 Starting Income API Tests');
  console.log('='.repeat(60));
  
  try {
    await loginAsAdmin();
    await getTestBookingId();
    await testCreateManualIncome();
    await testCreateBookingIncomeWithoutBookingId();
    await testCreateBookingIncomeWithInvalidBookingId();
    await testCreateBookingIncome();
    await testListIncome();
    await testGetIncomeById();
    await testUpdateIncome();
    await testGetSummary();
    await testSoftDeleteIncome();
    await testVerifySoftDelete();
    await testGetDeletedIncome();
    await testRestoreIncome();
    await testVerifyRestore();
    await testInvalidAmount();
    await testInvalidCurrency();
    await testUnauthorizedAccess();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
