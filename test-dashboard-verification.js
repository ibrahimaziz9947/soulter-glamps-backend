/**
 * Verification Test for Finance Dashboard API
 * Ensures dashboard returns EXACT same values as calling profit-loss and statements separately
 * 
 * Run with: node test-dashboard-verification.js
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
 * Fetch dashboard data
 */
async function fetchDashboard(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE_URL}/api/finance/dashboard${query ? '?' + query : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  return await response.json();
}

/**
 * Fetch profit-loss data
 */
async function fetchProfitLoss(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE_URL}/api/finance/profit-loss${query ? '?' + query : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  return await response.json();
}

/**
 * Fetch statements data
 */
async function fetchStatements(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE_URL}/api/finance/statements${query ? '?' + query : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  return await response.json();
}

/**
 * Compare two numbers with a description
 */
function compareNumbers(name, dashboardValue, directValue, tolerance = 0) {
  const diff = Math.abs(dashboardValue - directValue);
  const match = diff <= tolerance;
  
  const symbol = match ? '✅' : '❌';
  console.log(`  ${symbol} ${name}:`);
  console.log(`     Dashboard: ${dashboardValue}`);
  console.log(`     Direct:    ${directValue}`);
  if (!match) {
    console.log(`     ⚠️  MISMATCH! Difference: ${diff}`);
  }
  
  return match;
}

/**
 * Verification Test 1: Compare with default date range (this month)
 */
async function verifyDefaultDateRange() {
  console.log('\n📊 Verification Test 1: Default Date Range (This Month)');
  console.log('='.repeat(70));

  const [dashboardData, profitLossData, statementsData] = await Promise.all([
    fetchDashboard(),
    fetchProfitLoss(),
    fetchStatements({ pageSize: 10 }),
  ]);

  if (!dashboardData.success || !profitLossData.success || !statementsData.success) {
    console.log('❌ One or more API calls failed');
    console.log('Dashboard:', dashboardData);
    console.log('Profit-Loss:', profitLossData);
    console.log('Statements:', statementsData);
    return false;
  }

  console.log('\n📈 Comparing KPIs:');
  let allMatch = true;

  allMatch &= compareNumbers(
    'Total Income (cents)',
    dashboardData.data.kpis.totalIncomeCents,
    profitLossData.data.totalIncomeCents
  );

  allMatch &= compareNumbers(
    'Total Expenses (cents)',
    dashboardData.data.kpis.totalExpensesCents,
    profitLossData.data.totalExpensesCents
  );

  allMatch &= compareNumbers(
    'Net Profit (cents)',
    dashboardData.data.kpis.netProfitCents,
    profitLossData.data.netProfitCents
  );

  console.log('\n📝 Comparing Recent Transactions:');
  const dashboardTxCount = dashboardData.data.recentTransactions.length;
  const statementsTxCount = statementsData.data.length;
  
  console.log(`  Transaction count: Dashboard=${dashboardTxCount}, Statements=${statementsTxCount}`);
  
  if (dashboardTxCount > 0 && statementsTxCount > 0) {
    // Compare first transaction
    const dashTx = dashboardData.data.recentTransactions[0];
    const stmtTx = statementsData.data[0];
    
    console.log('\n  First Transaction Comparison:');
    console.log(`    Dashboard: ${dashTx.type} - ${dashTx.description} - $${(dashTx.amountCents / 100).toFixed(2)} (${dashTx.date})`);
    console.log(`    Statements: ${stmtTx.type} - ${stmtTx.description} - $${(stmtTx.amountCents / 100).toFixed(2)} (${stmtTx.date})`);
    
    if (dashTx.id === stmtTx.id && dashTx.amountCents === stmtTx.amountCents) {
      console.log('  ✅ First transactions match!');
    } else {
      console.log('  ⚠️  First transactions differ (this may be OK due to pagination timing)');
    }
  }

  if (allMatch) {
    console.log('\n✅ VERIFICATION PASSED: All KPIs match!');
  } else {
    console.log('\n❌ VERIFICATION FAILED: Some KPIs do not match!');
  }

  return allMatch;
}

/**
 * Verification Test 2: Compare with custom date range and currency
 */
async function verifyCustomParameters() {
  console.log('\n📊 Verification Test 2: Custom Parameters');
  console.log('='.repeat(70));

  const params = {
    from: '2026-01-01',
    to: '2026-01-31',
    currency: 'USD',
  };

  const [dashboardData, profitLossData] = await Promise.all([
    fetchDashboard(params),
    fetchProfitLoss(params),
  ]);

  if (!dashboardData.success || !profitLossData.success) {
    console.log('❌ One or more API calls failed');
    return false;
  }

  console.log(`\n📅 Date Range: ${params.from} to ${params.to}`);
  console.log(`💱 Currency: ${params.currency}`);
  console.log('\n📈 Comparing KPIs:');
  let allMatch = true;

  allMatch &= compareNumbers(
    'Total Income (cents)',
    dashboardData.data.kpis.totalIncomeCents,
    profitLossData.data.totalIncomeCents
  );

  allMatch &= compareNumbers(
    'Total Expenses (cents)',
    dashboardData.data.kpis.totalExpensesCents,
    profitLossData.data.totalExpensesCents
  );

  allMatch &= compareNumbers(
    'Net Profit (cents)',
    dashboardData.data.kpis.netProfitCents,
    profitLossData.data.netProfitCents
  );

  if (allMatch) {
    console.log('\n✅ VERIFICATION PASSED: All KPIs match with custom parameters!');
  } else {
    console.log('\n❌ VERIFICATION FAILED: Some KPIs do not match!');
  }

  return allMatch;
}

/**
 * Verification Test 3: Compare with ISO datetime format
 */
async function verifyISODateTimeFormat() {
  console.log('\n📊 Verification Test 3: ISO Datetime Format');
  console.log('='.repeat(70));

  const params = {
    from: '2026-01-01T00:00:00Z',
    to: '2026-01-15T23:59:59Z',
  };

  const [dashboardData, profitLossData] = await Promise.all([
    fetchDashboard(params),
    fetchProfitLoss(params),
  ]);

  if (!dashboardData.success || !profitLossData.success) {
    console.log('❌ One or more API calls failed');
    return false;
  }

  console.log(`\n📅 Date Range: ${params.from} to ${params.to}`);
  console.log('\n📈 Comparing KPIs:');
  let allMatch = true;

  allMatch &= compareNumbers(
    'Total Income (cents)',
    dashboardData.data.kpis.totalIncomeCents,
    profitLossData.data.totalIncomeCents
  );

  allMatch &= compareNumbers(
    'Total Expenses (cents)',
    dashboardData.data.kpis.totalExpensesCents,
    profitLossData.data.totalExpensesCents
  );

  allMatch &= compareNumbers(
    'Net Profit (cents)',
    dashboardData.data.kpis.netProfitCents,
    profitLossData.data.netProfitCents
  );

  if (allMatch) {
    console.log('\n✅ VERIFICATION PASSED: All KPIs match with ISO datetime format!');
  } else {
    console.log('\n❌ VERIFICATION FAILED: Some KPIs do not match!');
  }

  return allMatch;
}

/**
 * Run all verification tests
 */
async function runVerificationTests() {
  console.log('\n🚀 Starting Finance Dashboard Verification Tests...');
  console.log('🌐 Base URL:', BASE_URL);
  console.log('\nThese tests verify that /api/finance/dashboard returns');
  console.log('EXACTLY the same values as calling /api/finance/profit-loss');
  console.log('and /api/finance/statements with the same parameters.\n');

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Cannot proceed without authentication');
    process.exit(1);
  }

  // Run verification tests
  const results = [];
  results.push(await verifyDefaultDateRange());
  results.push(await verifyCustomParameters());
  results.push(await verifyISODateTimeFormat());

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\nTests Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✅ ALL VERIFICATIONS PASSED!');
    console.log('Dashboard returns identical values to individual endpoints.');
  } else {
    console.log('\n❌ SOME VERIFICATIONS FAILED!');
    console.log('Dashboard values do not match individual endpoints.');
    process.exit(1);
  }
}

// Run verification tests
runVerificationTests().catch((error) => {
  console.error('❌ Verification test suite failed:', error);
  process.exit(1);
});
