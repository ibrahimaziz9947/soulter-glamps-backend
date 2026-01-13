/**
 * Test Payables APIs
 * Tests payables endpoints with payment recording and status tracking
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
const PURCHASE_AMOUNT = 100000; // $1000.00 in cents

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

// Step 2: Create a purchase to test payables
async function createTestPurchase() {
  console.log('\n📝 Step 2: Create test purchase');
  const { status, data } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: PURCHASE_AMOUNT,
      currency: 'USD',
      purchaseDate: new Date().toISOString(),
      vendorName: 'Test Vendor Inc',
      status: 'CONFIRMED',
      reference: 'PAY-TEST-001',
      notes: 'Test purchase for payables testing',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    }),
  });
  
  if (status === 201 && data.success) {
    testPurchaseId = data.data.id;
    console.log('✅ Purchase created successfully');
    console.log('   ID:', testPurchaseId);
    console.log('   Amount:', data.data.amount, 'cents ($' + (data.data.amount / 100).toFixed(2) + ')');
    console.log('   Vendor:', data.data.vendorName);
    console.log('   Payment Status:', data.data.paymentStatus);
    console.log('   Paid Amount:', data.data.paidAmountCents, 'cents');
  } else {
    console.log('❌ Purchase creation failed:', data);
    process.exit(1);
  }
}

// Step 3: List payables (should include unpaid purchase)
async function testListPayables() {
  console.log('\n📋 Step 3: List payables (default: UNPAID & PARTIAL)');
  const { status, data } = await request('/api/finance/payables?page=1&pageSize=10', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Payables list retrieved');
    console.log('   Total records:', data.pagination.total);
    console.log('   Page:', data.pagination.page);
    const testPayable = data.data.find(p => p.id === testPurchaseId);
    if (testPayable) {
      console.log('   ✓ Test purchase found in payables');
      console.log('   Outstanding:', testPayable.outstandingCents, 'cents ($' + (testPayable.outstandingCents / 100).toFixed(2) + ')');
      console.log('   Payment Status:', testPayable.paymentStatus);
    } else {
      console.log('   ⚠️ Test purchase not found in payables list');
    }
  } else {
    console.log('❌ Failed to list payables:', data);
  }
}

// Step 4: Get payables summary
async function testGetSummary() {
  console.log('\n📊 Step 4: Get payables summary');
  const { status, data } = await request('/api/finance/payables/summary', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Payables summary retrieved');
    console.log('   Total Count:', data.data.totalCount);
    console.log('   Total Outstanding:', data.data.totalOutstandingCents, 'cents ($' + (data.data.totalOutstandingCents / 100).toFixed(2) + ')');
    console.log('   By Status:');
    console.log('     UNPAID:', data.data.totalsByStatus.UNPAID.count, 'items, $' + (data.data.totalsByStatus.UNPAID.outstandingCents / 100).toFixed(2));
    console.log('     PARTIAL:', data.data.totalsByStatus.PARTIAL.count, 'items, $' + (data.data.totalsByStatus.PARTIAL.outstandingCents / 100).toFixed(2));
    console.log('   By Currency:');
    Object.entries(data.data.totalsByCurrency).forEach(([currency, stats]) => {
      console.log(`     ${currency}:`, stats.count, 'items, $' + (stats.outstandingCents / 100).toFixed(2));
    });
  } else {
    console.log('❌ Failed to get summary:', data);
  }
}

// Step 5: Record partial payment
async function testPartialPayment() {
  console.log('\n💰 Step 5: Record partial payment ($400 of $1000)');
  const partialAmount = 40000; // $400 in cents
  
  const { status, data } = await request(`/api/finance/payables/${testPurchaseId}/pay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amountCents: partialAmount,
    }),
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Partial payment recorded');
    console.log('   Payment Amount:', data.data.paymentRecorded, 'cents ($' + (data.data.paymentRecorded / 100).toFixed(2) + ')');
    console.log('   Paid Amount:', data.data.paidAmountCents, 'cents ($' + (data.data.paidAmountCents / 100).toFixed(2) + ')');
    console.log('   Outstanding:', data.data.outstandingCents, 'cents ($' + (data.data.outstandingCents / 100).toFixed(2) + ')');
    console.log('   Payment Status:', data.data.paymentStatus);
    console.log('   Paid At:', data.data.paidAt || 'Not fully paid yet');
    
    if (data.data.paymentStatus !== 'PARTIAL') {
      console.log('   ❌ Expected payment status PARTIAL, got:', data.data.paymentStatus);
    }
  } else {
    console.log('❌ Partial payment failed:', data);
  }
}

// Step 6: Verify payable still appears in list (PARTIAL status)
async function testListAfterPartialPayment() {
  console.log('\n📋 Step 6: List payables after partial payment (should still appear)');
  const { status, data } = await request('/api/finance/payables', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    const testPayable = data.data.find(p => p.id === testPurchaseId);
    if (testPayable) {
      console.log('✅ Test payable still in list (PARTIAL status)');
      console.log('   Outstanding:', testPayable.outstandingCents, 'cents');
      console.log('   Payment Status:', testPayable.paymentStatus);
    } else {
      console.log('❌ Test payable not found in list');
    }
  }
}

// Step 7: Record final payment
async function testFinalPayment() {
  console.log('\n💰 Step 7: Record final payment (remaining $600)');
  const finalAmount = 60000; // $600 in cents
  
  const { status, data } = await request(`/api/finance/payables/${testPurchaseId}/pay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amountCents: finalAmount,
    }),
  });
  
  if (status === 200 && data.success) {
    console.log('✅ Final payment recorded');
    console.log('   Payment Amount:', data.data.paymentRecorded, 'cents ($' + (data.data.paymentRecorded / 100).toFixed(2) + ')');
    console.log('   Paid Amount:', data.data.paidAmountCents, 'cents ($' + (data.data.paidAmountCents / 100).toFixed(2) + ')');
    console.log('   Outstanding:', data.data.outstandingCents, 'cents');
    console.log('   Payment Status:', data.data.paymentStatus);
    console.log('   Paid At:', data.data.paidAt);
    
    if (data.data.paymentStatus !== 'PAID') {
      console.log('   ❌ Expected payment status PAID, got:', data.data.paymentStatus);
    }
    if (!data.data.paidAt) {
      console.log('   ❌ Expected paidAt to be set');
    }
    if (data.data.outstandingCents !== 0) {
      console.log('   ❌ Expected outstanding to be 0, got:', data.data.outstandingCents);
    }
  } else {
    console.log('❌ Final payment failed:', data);
  }
}

// Step 8: Verify payable no longer appears in default list (PAID)
async function testListAfterFullPayment() {
  console.log('\n📋 Step 8: List payables after full payment (should exclude PAID by default)');
  const { status, data } = await request('/api/finance/payables', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    const testPayable = data.data.find(p => p.id === testPurchaseId);
    if (!testPayable) {
      console.log('✅ Test payable correctly excluded from default list (PAID)');
    } else {
      console.log('❌ Test payable still appears in list (should be excluded)');
      console.log('   Payment Status:', testPayable.paymentStatus);
    }
  }
}

// Step 9: Verify can list PAID payables explicitly
async function testListPaidPayables() {
  console.log('\n📋 Step 9: List PAID payables explicitly (status=PAID)');
  const { status, data } = await request('/api/finance/payables?status=PAID', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  if (status === 200 && data.success) {
    const testPayable = data.data.find(p => p.id === testPurchaseId);
    if (testPayable) {
      console.log('✅ PAID payable found when explicitly requested');
      console.log('   Payment Status:', testPayable.paymentStatus);
      console.log('   Outstanding:', testPayable.outstandingCents, 'cents');
    } else {
      console.log('⚠️ PAID payable not found in explicit status=PAID filter');
    }
  }
}

// Step 10: Test overpayment validation
async function testOverpaymentValidation() {
  console.log('\n❌ Step 10: Test overpayment validation (should fail)');
  
  // Create another test purchase for overpayment test
  const { status: createStatus, data: createData } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 10000, // $100
      currency: 'USD',
      purchaseDate: new Date().toISOString(),
      vendorName: 'Overpayment Test Vendor',
      status: 'CONFIRMED',
    }),
  });
  
  if (createStatus === 201) {
    const overpayPurchaseId = createData.data.id;
    console.log('   Created test purchase for overpayment: $100');
    
    // Try to pay $200 (more than $100)
    const { status, data } = await request(`/api/finance/payables/${overpayPurchaseId}/pay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amountCents: 20000, // $200
      }),
    });
    
    if (status === 400 && !data.success) {
      console.log('✅ Overpayment correctly rejected');
      console.log('   Error:', data.error);
    } else {
      console.log('❌ Overpayment should have been rejected');
    }
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Testing Payables APIs');
  console.log('=' .repeat(60));
  
  try {
    await loginAsAdmin();
    await createTestPurchase();
    await testListPayables();
    await testGetSummary();
    await testPartialPayment();
    await testListAfterPartialPayment();
    await testFinalPayment();
    await testListAfterFullPayment();
    await testListPaidPayables();
    await testOverpaymentValidation();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All payables API tests completed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
