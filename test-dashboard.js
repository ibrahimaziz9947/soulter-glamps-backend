/**
 * Test script for Finance Dashboard API
 * Tests GET /api/finance/dashboard endpoint
 * 
 * Run with: node test-dashboard.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001';

// Test credentials (update with actual test credentials)
const TEST_CREDENTIALS = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@soulter.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
};

let authToken = '';

/**
 * Login and get auth token
 */
async function login() {
  console.log('\n🔐 Logging in...');
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_CREDENTIALS),
  });

  const data = await response.json();
  if (response.ok && data.data?.token) {
    authToken = data.data.token;
    console.log('✅ Login successful');
    return true;
  } else {
    console.error('❌ Login failed:', data);
    return false;
  }
}

/**
 * Test: Get dashboard with default date range (this month)
 */
async function testDefaultDashboard() {
  console.log('\n📊 Test: GET /api/finance/dashboard (default - this month)');
  const response = await fetch(`${BASE_URL}/api/finance/dashboard`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.ok && data.success) {
    console.log('✅ Test passed');
    console.log('📈 KPIs:');
    console.log('  - Total Income: $' + (data.data.kpis.totalIncomeCents / 100).toFixed(2));
    console.log('  - Total Expenses: $' + (data.data.kpis.totalExpensesCents / 100).toFixed(2));
    console.log('  - Net Profit: $' + (data.data.kpis.netProfitCents / 100).toFixed(2));
    console.log('  - Pending Payables: $' + (data.data.kpis.pendingPayablesCents / 100).toFixed(2));
    console.log('  - Overdue Payables: $' + (data.data.kpis.overduePayablesCents / 100).toFixed(2));
    console.log('  - Net Cash Flow: $' + (data.data.kpis.netCashFlowCents / 100).toFixed(2));
    console.log('  - Inventory Value: $' + (data.data.kpis.inventoryValueCents / 100).toFixed(2));
    console.log('  - Recent Transactions:', data.data.recentTransactions.length);
    
    // Validate cash flow computation
    if (data.data.recentTransactions.length > 0) {
      console.log('\n💰 Sample Recent Transactions:');
      data.data.recentTransactions.slice(0, 3).forEach((tx) => {
        const sign = tx.direction === 'in' ? '+' : '-';
        console.log(`  ${sign} $${(tx.amountCents / 100).toFixed(2)} - ${tx.type} - ${tx.description} (${tx.date})`);
      });
    }
  } else {
    console.log('❌ Test failed');
  }
}

/**
 * Test: Get dashboard with custom date range (YYYY-MM-DD format)
 */
async function testCustomDateRange() {
  console.log('\n📊 Test: GET /api/finance/dashboard (YYYY-MM-DD format)');
  const from = '2026-01-01';
  const to = '2026-01-31';
  
  const response = await fetch(
    `${BASE_URL}/api/finance/dashboard?from=${from}&to=${to}&limit=5`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.ok && data.success) {
    console.log('✅ Test passed');
    console.log('📅 Date Range:', data.data.range.from, 'to', data.data.range.to);
    console.log('📈 Recent Transactions:', data.data.recentTransactions.length);
  } else {
    console.log('❌ Test failed');
  }
}

/**
 * Test: Get dashboard with ISO datetime format
 */
async function testISODateTimeFormat() {
  console.log('\n📊 Test: GET /api/finance/dashboard (ISO datetime format)');
  const from = '2026-01-01T00:00:00Z';
  const to = '2026-01-15T23:59:59Z';
  
  const response = await fetch(
    `${BASE_URL}/api/finance/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=5`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.ok && data.success) {
    console.log('✅ Test passed');
    console.log('📅 Date Range:', data.data.range.from, 'to', data.data.range.to);
    console.log('📈 Recent Transactions:', data.data.recentTransactions.length);
  } else {
    console.log('❌ Test failed');
  }
}

/**
 * Test: Get dashboard with currency filter
 */
async function testCurrencyFilter() {
  console.log('\n📊 Test: GET /api/finance/dashboard (with currency filter)');
  const currency = 'USD';
  
  const response = await fetch(
    `${BASE_URL}/api/finance/dashboard?currency=${currency}&limit=3`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.ok && data.success) {
    console.log('✅ Test passed');
    console.log('💱 Currency Filter:', currency);
  } else {
    console.log('❌ Test failed');
  }
}

/**
 * Test: Invalid date range (from > to)
 */
async function testInvalidDateRange() {
  console.log('\n📊 Test: GET /api/finance/dashboard (invalid date range - from > to)');
  const from = '2026-12-31';
  const to = '2026-01-01';
  
  const response = await fetch(
    `${BASE_URL}/api/finance/dashboard?from=${from}&to=${to}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status === 400 && !data.success && data.message) {
    console.log('✅ Test passed - validation error caught:', data.message);
  } else {
    console.log('❌ Test failed - expected 400 error');
  }
}

/**
 * Test: Invalid date format
 */
async function testInvalidDateFormat() {
  console.log('\n📊 Test: GET /api/finance/dashboard (invalid date format)');
  const from = '2026/01/01'; // Wrong format - uses slashes instead of dashes
  
  const response = await fetch(
    `${BASE_URL}/api/finance/dashboard?from=${from}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status === 400 && !data.success && data.message) {
    console.log('✅ Test passed - validation error caught:', data.message);
  } else {
    console.log('❌ Test failed - expected 400 error');
  }
}

/**
 * Test: Invalid limit parameter
 */
async function testInvalidLimit() {
  console.log('\n📊 Test: GET /api/finance/dashboard (invalid limit)');
  
  const response = await fetch(
    `${BASE_URL}/api/finance/dashboard?limit=999`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status === 400 && !data.success && data.message) {
    console.log('✅ Test passed - validation error caught:', data.message);
  } else {
    console.log('❌ Test failed - expected 400 error');
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Finance Dashboard API Tests...');
  console.log('🌐 Base URL:', BASE_URL);

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Cannot proceed without authentication');
    process.exit(1);
  }

  // Run tests
  await testDefaultDashboard();
  await testCustomDateRange();
  await testISODateTimeFormat();
  await testCurrencyFilter();
  await testInvalidDateRange();
  await testInvalidDateFormat();
  await testInvalidLimit();

  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
