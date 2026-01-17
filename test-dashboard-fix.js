/**
 * Quick test script for the exact failing query
 * Tests: GET /api/finance/dashboard?from=2025-12-31&to=2026-01-17&limit=5
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001';

const TEST_CREDENTIALS = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@soulter.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
};

let authToken = '';

async function login() {
  console.log('🔐 Logging in...');
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_CREDENTIALS),
  });

  const data = await response.json();
  if (response.ok && data.data?.token) {
    authToken = data.data.token;
    console.log('✅ Login successful\n');
    return true;
  } else {
    console.error('❌ Login failed:', data);
    return false;
  }
}

async function testExactFailingQuery() {
  console.log('📊 Testing EXACT failing query...');
  console.log('Query: GET /api/finance/dashboard?from=2025-12-31&to=2026-01-17&limit=5');
  console.log('='.repeat(70));

  const url = `${BASE_URL}/api/finance/dashboard?from=2025-12-31&to=2026-01-17&limit=5`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  console.log('\n📤 Response Status:', response.status);
  console.log('📦 Response Body:', JSON.stringify(data, null, 2));

  if (response.ok && data.success) {
    console.log('\n✅ SUCCESS! Dashboard endpoint is working!');
    console.log('\n📈 KPIs Summary:');
    console.log('  - Total Income: $' + (data.data.kpis.totalIncomeCents / 100).toFixed(2));
    console.log('  - Total Expenses: $' + (data.data.kpis.totalExpensesCents / 100).toFixed(2));
    console.log('  - Net Profit: $' + (data.data.kpis.netProfitCents / 100).toFixed(2));
    console.log('  - Pending Payables: $' + (data.data.kpis.pendingPayablesCents / 100).toFixed(2));
    console.log('  - Overdue Payables: $' + (data.data.kpis.overduePayablesCents / 100).toFixed(2));
    console.log('  - Net Cash Flow: $' + (data.data.kpis.netCashFlowCents / 100).toFixed(2));
    console.log('  - Recent Transactions:', data.data.recentTransactions.length);
    
    // Check for zero KPIs
    const allZero = data.data.kpis.totalIncomeCents === 0 && 
                     data.data.kpis.totalExpensesCents === 0 && 
                     data.data.kpis.netProfitCents === 0;\n    if (allZero) {\n      console.log('\\n⚠️  WARNING: All KPIs are zero - this may indicate a data or calculation issue');\n    }\n    \n    // Display sample transactions with direction\n    if (data.data.recentTransactions.length > 0) {\n      console.log('\\n💰 Sample Recent Transactions:');\n      data.data.recentTransactions.slice(0, 3).forEach((tx) => {\n        const sign = tx.direction === 'in' ? '+' : '-';\n        const dirSymbol = tx.direction === 'in' ? '⬇️ ' : '⬆️ ';\n        console.log(`  ${dirSymbol}${sign}$${(tx.amountCents / 100).toFixed(2)} - ${tx.type} - ${tx.description} (${tx.date})`);\n      });\n    }
    return true;
  } else {
    console.log('\n❌ FAILED! Dashboard endpoint returned an error');
    if (response.status === 500) {
      console.log('⚠️  500 Error - Check backend logs for details');
    }
    return false;
  }
}

async function testComparisonWithProfitLoss() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 Verification: Comparing with Profit-Loss endpoint');
  console.log('='.repeat(70));

  const params = 'from=2025-12-31&to=2026-01-17';

  const [dashboardResponse, profitLossResponse] = await Promise.all([
    fetch(`${BASE_URL}/api/finance/dashboard?${params}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    }),
    fetch(`${BASE_URL}/api/finance/profit-loss?${params}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    }),
  ]);

  const dashboard = await dashboardResponse.json();
  const profitLoss = await profitLossResponse.json();

  if (!dashboard.success || !profitLoss.success) {
    console.log('❌ One or both endpoints failed');
    return false;
  }

  console.log('\n📊 Dashboard KPIs:');
  console.log('  Income:', dashboard.data.kpis.totalIncomeCents);
  console.log('  Expenses:', dashboard.data.kpis.totalExpensesCents);
  console.log('  Net Profit:', dashboard.data.kpis.netProfitCents);

  console.log('\n📊 Profit-Loss KPIs:');
  console.log('  Income:', profitLoss.data.totalIncomeCents);
  console.log('  Expenses:', profitLoss.data.totalExpensesCents);
  console.log('  Net Profit:', profitLoss.data.netProfitCents);

  const incomeMatch = dashboard.data.kpis.totalIncomeCents === profitLoss.data.totalIncomeCents;
  const expenseMatch = dashboard.data.kpis.totalExpensesCents === profitLoss.data.totalExpensesCents;
  const profitMatch = dashboard.data.kpis.netProfitCents === profitLoss.data.netProfitCents;

  console.log('\n🔍 Comparison:');
  console.log(`  Income: ${incomeMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
  console.log(`  Expenses: ${expenseMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
  console.log(`  Net Profit: ${profitMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

  if (incomeMatch && expenseMatch && profitMatch) {
    console.log('\n✅ ALL KPIs MATCH! Dashboard is correctly reusing profit-loss logic.');
    return true;
  } else {
    console.log('\n❌ MISMATCH DETECTED! Dashboard values differ from profit-loss.');
    return false;
  }
}

async function run() {
  console.log('🚀 Dashboard Fix Verification Test');
  console.log('🌐 Base URL:', BASE_URL);
  console.log('');

  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Cannot proceed without authentication');
    process.exit(1);
  }

  const testPassed = await testExactFailingQuery();
  
  if (testPassed) {
    await testComparisonWithProfitLoss();
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Test completed!');
  console.log('='.repeat(70));
}

run().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
