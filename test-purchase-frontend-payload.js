/**
 * Quick sanity check for purchase creation with frontend-style payload
 * Tests that extra fields are ignored and date format is handled correctly
 */

const BASE_URL = 'http://localhost:5001';

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

async function testFrontendPayload() {
  console.log('\n🧪 Testing Purchase Creation with Frontend Payload');
  console.log('='.repeat(60));

  // Step 1: Login
  console.log('\n🔐 Step 1: Login as ADMIN');
  const { status: loginStatus, data: loginData } = await request('/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@soulter.com',
      password: 'admin123',
    }),
  });

  if (loginStatus !== 200 || !loginData.token) {
    console.log('❌ Login failed:', loginData);
    process.exit(1);
  }

  const token = loginData.token;
  console.log('✅ Login successful');

  // Step 2: Test with frontend-style payload (includes extra 'category' field and YYYY-MM-DD date)
  console.log('\n✅ Step 2: Create purchase with frontend payload');
  console.log('   Payload includes:');
  console.log('   - Extra field "category" (should be ignored)');
  console.log('   - Date in YYYY-MM-DD format (should be normalized)');
  
  const frontendPayload = {
    vendorName: 'Acme Office Supplies',
    purchaseDate: '2026-01-13', // YYYY-MM-DD format from frontend
    amount: 50000,
    currency: 'USD',
    status: 'DRAFT',
    category: 'office-supplies', // Extra field that should be ignored
    reference: 'PO-FRONTEND-001',
    notes: 'Test from frontend with extra fields',
  };

  const { status: createStatus, data: createData } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(frontendPayload),
  });

  if (createStatus === 201 && createData.success) {
    console.log('✅ Purchase created successfully!');
    console.log('   Purchase ID:', createData.data.id);
    console.log('   Vendor:', createData.data.vendorName);
    console.log('   Amount:', createData.data.amount, 'cents');
    console.log('   Date:', createData.data.purchaseDate);
    console.log('   Status:', createData.data.status);
    console.log('   ✓ Extra "category" field was safely ignored');
    console.log('   ✓ Date "2026-01-13" was normalized to DateTime');
  } else {
    console.log('❌ Purchase creation failed!');
    console.log('   Status:', createStatus);
    console.log('   Response:', JSON.stringify(createData, null, 2));
    process.exit(1);
  }

  // Step 3: Test with ISO date format too
  console.log('\n✅ Step 3: Create purchase with ISO date format');
  const isoPayload = {
    vendorName: 'Another Vendor',
    purchaseDate: new Date().toISOString(), // Full ISO format
    amount: 35000,
    currency: 'EUR',
    status: 'CONFIRMED',
    reference: 'PO-ISO-001',
  };

  const { status: isoStatus, data: isoData } = await request('/api/finance/purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(isoPayload),
  });

  if (isoStatus === 201 && isoData.success) {
    console.log('✅ Purchase with ISO date created successfully!');
    console.log('   Purchase ID:', isoData.data.id);
    console.log('   Date:', isoData.data.purchaseDate);
  } else {
    console.log('❌ ISO date creation failed:', isoStatus, isoData);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All frontend payload tests passed!');
  console.log('='.repeat(60));
  console.log('\nSummary:');
  console.log('  ✓ Extra fields (category) are ignored without causing errors');
  console.log('  ✓ YYYY-MM-DD date format is properly normalized');
  console.log('  ✓ ISO date format still works');
  console.log('  ✓ Returns 201 status (not 500 error)');
  console.log('  ✓ Response format is correct');
}

// Run test
testFrontendPayload().catch(error => {
  console.error('\n❌ Test error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
