/**
 * Test Purchase APIs
 * Tests all purchase endpoints with proper validation and role-based access
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
let testPurchaseId = null;

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

// Step 2: Create purchase (success)
async function testCreatePurchase() {
  console.log('\n✅ Step 2: Create purchase (should succeed)');
  const { status, data } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 50000, // $500.00 in cents
      currency: 'USD',
      purchaseDate: new Date().toISOString(),
      vendorName: 'Acme Office Supplies',
      status: 'DRAFT',
      reference: 'PO-TEST-001',
      notes: 'Test purchase for integration testing',
    }),
  });
  
  if (status === 201 && data.success) {
    testPurchaseId = data.data.id;
    console.log('✅ Purchase created successfully');
    console.log('   ID:', testPurchaseId);
    console.log('   Amount:', data.data.amount, 'cents ($' + (data.data.amount / 100).toFixed(2) + ')');
    console.log('   Vendor:', data.data.vendorName);
    console.log('   Status:', data.data.status);
  } else {
    console.log('❌ Purchase creation failed:', data);
  }
}

// Step 3: List purchases (should see created record)
async function testListPurchases() {
  console.log('\n📋 Step 3: List all purchases');
  const { status, data } = await request('/api/finance/purchases?page=1&limit=10', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Purchase list retrieved');
    console.log('   Total records:', data.pagination.total);
    console.log('   Page:', data.pagination.page);
    console.log('   Total amount:', data.summary.totalAmount, 'cents ($' + (data.summary.totalAmount / 100).toFixed(2) + ')');
    console.log('   Records:');
    data.data.slice(0, 3).forEach(purchase => {
      console.log(`   - ${purchase.vendorName}: $${(purchase.amount / 100).toFixed(2)} (${purchase.status})`);
    });
  } else {
    console.log('❌ Failed to list purchases:', data);
  }
}

// Step 4: Get purchase by ID
async function testGetPurchaseById() {
  if (!testPurchaseId) {
    console.log('\n⏭️  Step 4: Skipped (no purchase ID available)');
    return;
  }
  
  console.log('\n🔍 Step 4: Get purchase by ID');
  const { status, data } = await request(`/api/finance/purchases/${testPurchaseId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Purchase retrieved');
    console.log('   ID:', data.data.id);
    console.log('   Amount:', data.data.amount, 'cents');
    console.log('   Vendor:', data.data.vendorName);
    console.log('   Reference:', data.data.reference);
    console.log('   Created by:', data.data.createdBy?.name || 'N/A');
  } else {
    console.log('❌ Failed to get purchase:', data);
  }
}

// Step 5: Update purchase
async function testUpdatePurchase() {
  if (!testPurchaseId) {
    console.log('\n⏭️  Step 5: Skipped (no purchase ID available)');
    return;
  }
  
  console.log('\n✏️  Step 5: Update purchase');
  const { status, data } = await request(`/api/finance/purchases/${testPurchaseId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 55000, // Updated to $550.00
      status: 'CONFIRMED',
      notes: 'Updated: Purchase confirmed and processed',
    }),
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Purchase updated successfully');
    console.log('   New amount:', data.data.amount, 'cents ($' + (data.data.amount / 100).toFixed(2) + ')');
    console.log('   New status:', data.data.status);
    console.log('   New notes:', data.data.notes);
    console.log('   Updated by:', data.data.updatedBy?.name || 'N/A');
  } else {
    console.log('❌ Failed to update purchase:', data);
  }
}

// Step 6: Get summary
async function testGetSummary() {
  console.log('\n📊 Step 6: Get purchase summary');
  const { status, data } = await request('/api/finance/purchases/summary', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Summary retrieved');
    console.log('   Total count:', data.data.totalCount);
    console.log('   Total amount:', data.data.totalAmountCents, 'cents ($' + (data.data.totalAmountCents / 100).toFixed(2) + ')');
    console.log('   By Status:', JSON.stringify(data.data.totalsByStatus, null, 2));
    console.log('   By Currency:', JSON.stringify(data.data.totalsByCurrency, null, 2));
  } else {
    console.log('❌ Failed to get summary:', data);
  }
}

// Step 7: Test search filter
async function testSearchPurchases() {
  console.log('\n🔍 Step 7: Test search filter (vendor name)');
  const { status, data } = await request('/api/finance/purchases?q=Acme', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Search results retrieved');
    console.log('   Found:', data.pagination.total, 'record(s)');
    if (data.data.length > 0) {
      console.log('   First result:', data.data[0].vendorName);
    }
  } else {
    console.log('❌ Failed to search purchases:', data);
  }
}

// Step 8: Test status filter
async function testFilterByStatus() {
  console.log('\n🔍 Step 8: Test status filter (CONFIRMED)');
  const { status, data } = await request('/api/finance/purchases?status=CONFIRMED', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Filtered results retrieved');
    console.log('   CONFIRMED purchases:', data.pagination.total);
    const allConfirmed = data.data.every(p => p.status === 'CONFIRMED');
    if (allConfirmed) {
      console.log('   ✓ All results have CONFIRMED status');
    } else {
      console.log('   ✗ Some results have incorrect status');
    }
  } else {
    console.log('❌ Failed to filter purchases:', data);
  }
}

// Step 9: Soft delete purchase
async function testSoftDeletePurchase() {
  if (!testPurchaseId) {
    console.log('\n⏭️  Step 9: Skipped (no purchase ID available)');
    return;
  }
  
  console.log('\n🗑️  Step 9: Soft delete purchase');
  const { status, data } = await request(`/api/finance/purchases/${testPurchaseId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Purchase soft deleted');
    console.log('   Message:', data.message);
  } else {
    console.log('❌ Failed to delete purchase:', data);
  }
}

// Step 10: Verify soft delete (should not appear in list)
async function testVerifySoftDelete() {
  if (!testPurchaseId) {
    console.log('\n⏭️  Step 10: Skipped (no purchase ID available)');
    return;
  }
  
  console.log('\n🔍 Step 10: Verify purchase is excluded from list');
  const { status, data } = await request('/api/finance/purchases', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    const found = data.data.find(purchase => purchase.id === testPurchaseId);
    if (!found) {
      console.log('✅ Purchase correctly excluded from list');
    } else {
      console.log('❌ Purchase still appears in list (should be hidden)');
    }
  } else {
    console.log('❌ Failed to list purchases:', data);
  }
}

// Step 11: Get deleted purchase by ID (should return 404)
async function testGetDeletedPurchase() {
  if (!testPurchaseId) {
    console.log('\n⏭️  Step 11: Skipped (no purchase ID available)');
    return;
  }
  
  console.log('\n🔍 Step 11: Try to get deleted purchase by ID (should fail)');
  const { status, data } = await request(`/api/finance/purchases/${testPurchaseId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 404 && !data.success) {
    console.log('✅ Correctly returns 404 for deleted purchase');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have returned 404:', status, data);
  }
}

// Step 12: Restore purchase
async function testRestorePurchase() {
  if (!testPurchaseId) {
    console.log('\n⏭️  Step 12: Skipped (no purchase ID available)');
    return;
  }
  
  console.log('\n♻️  Step 12: Restore deleted purchase');
  const { status, data } = await request(`/api/finance/purchases/${testPurchaseId}/restore`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Purchase restored successfully');
    console.log('   Message:', data.message);
    console.log('   Deleted at:', data.data.deletedAt);
  } else {
    console.log('❌ Failed to restore purchase:', data);
  }
}

// Step 13: Verify restore (should appear in list again)
async function testVerifyRestore() {
  if (!testPurchaseId) {
    console.log('\n⏭️  Step 13: Skipped (no purchase ID available)');
    return;
  }
  
  console.log('\n🔍 Step 13: Verify purchase is back in list');
  const { status, data } = await request('/api/finance/purchases', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    const found = data.data.find(purchase => purchase.id === testPurchaseId);
    if (found) {
      console.log('✅ Purchase correctly appears in list again');
      console.log('   Vendor:', found.vendorName);
      console.log('   Amount:', found.amount, 'cents');
    } else {
      console.log('❌ Purchase not found in list (should be restored)');
    }
  } else {
    console.log('❌ Failed to list purchases:', data);
  }
}

// Step 14: Test validation - negative amount
async function testNegativeAmount() {
  console.log('\n❌ Step 14: Create purchase with negative amount (should fail)');
  const { status, data } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: -1000, // Negative amount
      currency: 'USD',
      purchaseDate: new Date().toISOString(),
      vendorName: 'Test Vendor',
    }),
  });
  
  if (status === 400 && !data.success) {
    console.log('✅ Correctly rejected negative amount');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 400:', status, data);
  }
}

// Step 15: Test validation - missing required field (vendorName)
async function testMissingVendorName() {
  console.log('\n❌ Step 15: Create purchase without vendor name (should fail)');
  const { status, data } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 10000,
      currency: 'USD',
      purchaseDate: new Date().toISOString(),
      // Missing vendorName
    }),
  });
  
  if (status === 400 && !data.success) {
    console.log('✅ Correctly rejected missing vendor name');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 400:', status, data);
  }
}

// Step 16: Test validation - invalid currency
async function testInvalidCurrency() {
  console.log('\n❌ Step 16: Create purchase with invalid currency (should fail)');
  const { status, data } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 10000,
      currency: 'US', // Only 2 characters instead of 3
      purchaseDate: new Date().toISOString(),
      vendorName: 'Test Vendor',
    }),
  });
  
  if (status === 400 && !data.success) {
    console.log('✅ Correctly rejected invalid currency');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 400:', status, data);
  }
}

// Step 17: Test validation - invalid status
async function testInvalidStatus() {
  console.log('\n❌ Step 17: Create purchase with invalid status (should fail)');
  const { status, data } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 10000,
      currency: 'USD',
      purchaseDate: new Date().toISOString(),
      vendorName: 'Test Vendor',
      status: 'INVALID_STATUS',
    }),
  });
  
  if (status === 400 && !data.success) {
    console.log('✅ Correctly rejected invalid status');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 400:', status, data);
  }
}

// Step 18: Test validation - invalid purchaseDate
async function testInvalidDate() {
  console.log('\n❌ Step 18: Create purchase with invalid date (should fail)');
  const { status, data } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 10000,
      currency: 'USD',
      purchaseDate: 'not-a-date',
      vendorName: 'Test Vendor',
    }),
  });
  
  if (status === 400 && !data.success) {
    console.log('✅ Correctly rejected invalid date');
    console.log('   Error:', data.error);
  } else {
    console.log('❌ Should have failed with 400:', status, data);
  }
}

// Step 19: Test unauthorized access
async function testUnauthorizedAccess() {
  console.log('\n🔒 Step 19: Try to access without token (should fail)');
  const { status, data } = await request('/api/finance/purchases', {
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
  console.log('\n🧪 Starting Purchase API Tests');
  console.log('='.repeat(60));
  
  try {
    await loginAsAdmin();
    await testCreatePurchase();
    await testListPurchases();
    await testGetPurchaseById();
    await testUpdatePurchase();
    await testGetSummary();
    await testSearchPurchases();
    await testFilterByStatus();
    await testSoftDeletePurchase();
    await testVerifySoftDelete();
    await testGetDeletedPurchase();
    await testRestorePurchase();
    await testVerifyRestore();
    await testNegativeAmount();
    await testMissingVendorName();
    await testInvalidCurrency();
    await testInvalidStatus();
    await testInvalidDate();
    await testUnauthorizedAccess();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60));
    console.log('\nTest Summary:');
    console.log('  - CRUD operations: Create, Read, Update, Delete, Restore');
    console.log('  - Search & filtering: Text search, status filter');
    console.log('  - Aggregations: Summary with status & currency breakdown');
    console.log('  - Validation: Amount, currency, vendor, date, status');
    console.log('  - Security: Authorization checks');
    console.log('  - Soft delete: Proper exclusion and restoration');
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
