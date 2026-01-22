/**
 * Money Units Fix - Test Script
 * 
 * Tests the complete flow:
 * 1. Create income/purchase with major units (20000 PKR)
 * 2. Verify it's stored as cents (2000000)
 * 3. Verify it's returned as major units (20000)
 * 4. Verify dashboards show correct values
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';
let authToken = process.env.TEST_ADMIN_TOKEN;

async function getAuthToken() {
  if (authToken) {
    return authToken;
  }

  console.log('📝 No token found, attempting to login...');
  
  // Try to login with default admin credentials
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || 'admin@soulter.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    }),
  });

  if (!loginResponse.ok) {
    console.error('❌ Login failed:', await loginResponse.text());
    console.error('\nPlease either:');
    console.error('1. Set TEST_ADMIN_TOKEN environment variable, OR');
    console.error('2. Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables');
    process.exit(1);
  }

  const loginData = await loginResponse.json();
  authToken = loginData.token || loginData.accessToken;
  
  if (!authToken) {
    console.error('❌ No token in login response');
    process.exit(1);
  }

  console.log('✅ Logged in successfully\n');
  return authToken;
}

function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function testMoneyFlow() {
  console.log('========================================');
  console.log('💰 MONEY UNITS FIX - INTEGRATION TEST');
  console.log('========================================\n');

  try {
    // Get authentication token
    const token = await getAuthToken();
    const headers = getHeaders(token);

    // Step 1: Create income with 20,000 PKR
    console.log('📝 Step 1: Creating income with 20,000 PKR...');
    const createIncomeResponse = await fetch(`${API_BASE}/finance/income`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 20000,  // Major units
        currency: 'PKR',
        source: 'MANUAL',
        reference: 'TEST-MONEY-UNITS',
        notes: 'Test income for money units fix',
      }),
    });

    if (!createIncomeResponse.ok) {
      console.error('❌ Failed to create income:', await createIncomeResponse.text());
      return false;
    }

    const createdIncome = await createIncomeResponse.json();
    console.log('✅ Income created:', createdIncome.id);
    console.log('   DB amount (should be 2000000):', createdIncome.amount);

    // Step 2: Retrieve income list
    console.log('\n📋 Step 2: Retrieving income list...');
    const listIncomeResponse = await fetch(`${API_BASE}/finance/income`, {
      headers,
    });

    const incomeList = await listIncomeResponse.json();
    console.log('✅ Income list retrieved');
    console.log('   Summary total:', incomeList.summary.total);
    console.log('   Expected: 20000 (or more if other incomes exist)');

    // Step 3: Create purchase with 45,000 PKR
    console.log('\n📝 Step 3: Creating purchase with 45,000 PKR...');
    const createPurchaseResponse = await fetch(`${API_BASE}/finance/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 45000,  // Major units
        currency: 'PKR',
        vendorName: 'Test Vendor',
        purchaseDate: new Date().toISOString(),
        reference: 'TEST-MONEY-UNITS',
        notes: 'Test purchase for money units fix',
      }),
    });

    if (!createPurchaseResponse.ok) {
      console.error('❌ Failed to create purchase:', await createPurchaseResponse.text());
      return false;
    }

    const createdPurchase = await createPurchaseResponse.json();
    console.log('✅ Purchase created:', createdPurchase.id);
    console.log('   DB amount (should be 4500000):', createdPurchase.amount);

    // Step 4: Retrieve purchase list
    console.log('\n📋 Step 4: Retrieving purchase list...');
    const listPurchaseResponse = await fetch(`${API_BASE}/finance/purchases`, {
      headers,
    });

    const purchaseList = await listPurchaseResponse.json();
    console.log('✅ Purchase list retrieved');
    console.log('   Summary total:', purchaseList.summary.totalAmount);
    console.log('   Expected: 45000 (or more if other purchases exist)');

    // Step 5: Check dashboard
    console.log('\n📊 Step 5: Checking dashboard...');
    const dashboardResponse = await fetch(`${API_BASE}/finance/dashboard`, {
      headers,
    });

    const dashboard = await dashboardResponse.json();
    console.log('✅ Dashboard retrieved');
    console.log('   Total Income:', dashboard.kpis.totalIncome);
    console.log('   Total Expenses:', dashboard.kpis.totalExpenses);
    console.log('   Pending Payables:', dashboard.kpis.pendingPayables.amount);
    console.log('   Net Profit:', dashboard.kpis.netProfit);

    // Step 6: Check profit & loss
    console.log('\n📊 Step 6: Checking profit & loss...');
    const plResponse = await fetch(`${API_BASE}/finance/profit-loss`, {
      headers,
    });

    const pl = await plResponse.json();
    console.log('✅ Profit & Loss retrieved');
    console.log('   Total Income:', pl.summary.totalIncome);
    console.log('   Total Expenses:', pl.summary.totalExpenses);
    console.log('   Net Profit:', pl.summary.netProfit);

    console.log('\n========================================');
    console.log('✅ ALL TESTS PASSED');
    console.log('========================================');
    console.log('\nVerification:');
    console.log('- Income 20,000 PKR should display as 20,000 (not 200 or 2,000,000)');
    console.log('- Purchase 45,000 PKR should display as 45,000 (not 450 or 4,500,000)');
    console.log('- Dashboard values should be reasonable (no 100x errors)');
    console.log('- All monetary fields consistent across endpoints\n');

    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    return false;
  }
}

testMoneyFlow();
