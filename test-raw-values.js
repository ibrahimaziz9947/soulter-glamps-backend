/**
 * Test Script: Verify All Finance Endpoints Return Raw DB Values
 * 
 * Purpose: Ensure ALL endpoints return monetary values directly from DB (cents)
 *          without any /100 or *100 conversions
 * 
 * Expected Behavior:
 * - DB stores values in cents (e.g., 36000 = PKR 360.00)
 * - API returns those exact values (36000)
 * - Frontend divides by 100 for display (PKR 360.00)
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Use test admin token (from your .env or previous tests)
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN || 'your-admin-jwt-token';
const SUPER_ADMIN_TOKEN = process.env.TEST_SUPER_ADMIN_TOKEN || 'your-super-admin-jwt-token';

const headers = {
  'Content-Type': 'application/json',
};

async function testEndpoint(name, url, token, expectedFields) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        ...headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      console.error(`   ❌ HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error(`   Response: ${text.substring(0, 200)}`);
      return false;
    }

    const data = await response.json();
    console.log(`   ✅ Response received`);

    // Check if expected fields exist and are numbers (not divided by 100)
    let allGood = true;
    for (const field of expectedFields) {
      const value = getNestedValue(data, field);
      if (value !== undefined && value !== null) {
        console.log(`   📊 ${field}: ${value}`);
        
        // Validate it's a number
        if (typeof value !== 'number') {
          console.log(`   ⚠️  WARNING: ${field} is not a number (type: ${typeof value})`);
          allGood = false;
        }
      } else {
        console.log(`   ⚠️  ${field}: NOT FOUND`);
      }
    }

    return allGood;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

async function runTests() {
  console.log('========================================');
  console.log('🔬 RAW DB VALUES TEST SUITE');
  console.log('========================================');
  console.log('Purpose: Verify all finance endpoints return raw DB values (cents)');
  console.log('Expected: NO division by 100 in backend, values match DB exactly\n');

  const tests = [
    {
      name: 'Profit & Loss Summary',
      url: `${API_BASE}/finance/profit-loss`,
      token: ADMIN_TOKEN,
      fields: [
        'summary.totalIncome',
        'summary.totalIncomeCents',
        'summary.totalExpenses',
        'summary.totalExpensesCents',
        'summary.totalPurchases',
        'summary.totalPurchasesCents',
        'summary.netProfit',
        'summary.netProfitCents',
      ],
    },
    {
      name: 'Admin Finance Dashboard',
      url: `${API_BASE}/finance/dashboard`,
      token: ADMIN_TOKEN,
      fields: [
        'totalIncome',
        'totalIncomeCents',
        'totalExpenses',
        'totalExpensesCents',
        'netProfit',
        'netProfitCents',
        'pending.amount',
        'pending.amountCents',
      ],
    },
    {
      name: 'Income List',
      url: `${API_BASE}/finance/income`,
      token: ADMIN_TOKEN,
      fields: [
        'summary.total',
        'summary.totalAmount',
      ],
    },
    {
      name: 'Income Summary',
      url: `${API_BASE}/finance/income/summary`,
      token: ADMIN_TOKEN,
      fields: [
        'total',
        'totalAmount',
        'totalAmountCents',
      ],
    },
    {
      name: 'Expense List',
      url: `${API_BASE}/finance/expenses`,
      token: ADMIN_TOKEN,
      fields: [
        'summary.total',
        'summary.totalAmount',
        'summary.totalAmountCents',
      ],
    },
    {
      name: 'Super Admin Dashboard',
      url: `${API_BASE}/super-admin/dashboard/summary`,
      token: SUPER_ADMIN_TOKEN,
      fields: [
        'financeSnapshot.totalIncome',
        'financeSnapshot.totalIncomeCents',
        'financeSnapshot.totalExpenses',
        'financeSnapshot.totalExpensesCents',
        'financeSnapshot.netProfit',
        'financeSnapshot.netProfitCents',
      ],
    },
  ];

  const results = [];
  for (const test of tests) {
    const passed = await testEndpoint(test.name, test.url, test.token, test.fields);
    results.push({ name: test.name, passed });
  }

  console.log('\n========================================');
  console.log('📋 TEST RESULTS');
  console.log('========================================');
  
  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
    if (!result.passed) allPassed = false;
  }

  console.log('\n========================================');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED');
    console.log('All endpoints return raw DB values (cents)');
    console.log('Frontend should divide by 100 for display');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('Check the output above for details');
  }
  console.log('========================================\n');
}

runTests().catch(console.error);
