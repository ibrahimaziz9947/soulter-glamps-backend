/**
 * Test script for Profit & Loss V1 API
 * Tests the /api/finance/profit-loss endpoint with various filters
 * 
 * Prerequisites:
 * - Server running on http://localhost:5001
 * - Valid admin/super_admin JWT token
 * - Sample data in Income, Expense, and Purchase tables
 * 
 * Usage:
 * node test-profit-loss.js
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';
const TOKEN = process.env.TEST_TOKEN || '';

if (!TOKEN) {
  console.error('❌ Error: TEST_TOKEN environment variable is required');
  console.log('Usage: TEST_TOKEN=your_jwt_token node test-profit-loss.js');
  process.exit(1);
}

/**
 * Make an HTTP request
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

/**
 * Test 1: Get P&L without filters
 */
async function testBasicProfitAndLoss() {
  console.log('\n📊 Test 1: GET /api/finance/profit-loss (no filters)');
  console.log('=' .repeat(60));

  const { status, data } = await request('/api/finance/profit-loss', {
    method: 'GET',
  });

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success) {
    console.log('✅ Test 1 passed: Retrieved P&L statement');
    console.log(`   - Total Income: ${data.data.summary.totalIncomeCents} cents`);
    console.log(`   - Total Expenses: ${data.data.summary.totalExpensesCents} cents`);
    console.log(`   - Total Purchases: ${data.data.summary.totalPurchasesCents} cents`);
    console.log(`   - Net Profit: ${data.data.summary.netProfitCents} cents`);
    if (data.data.breakdown) {
      console.log(`   - Income sources: ${data.data.breakdown.incomeBySource.length}`);
      console.log(`   - Expense categories: ${data.data.breakdown.expensesByCategory.length}`);
      console.log(`   - Vendors: ${data.data.breakdown.purchasesByVendor.length}`);
    }
  } else {
    console.log('❌ Test 1 failed:', data.error || 'Unknown error');
  }

  return status === 200 && data.success;
}

/**
 * Test 2: Get P&L with date range
 */
async function testProfitAndLossWithDateRange() {
  console.log('\n📊 Test 2: GET /api/finance/profit-loss?from=2026-01-01&to=2026-01-31');
  console.log('=' .repeat(60));

  const { status, data } = await request(
    '/api/finance/profit-loss?from=2026-01-01&to=2026-01-31',
    {
      method: 'GET',
    }
  );

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success) {
    console.log('✅ Test 2 passed: Retrieved P&L with date range');
    console.log(`   - Filters: ${JSON.stringify(data.data.filters)}`);
    console.log(`   - Net Profit: ${data.data.summary.netProfitCents} cents`);
  } else {
    console.log('❌ Test 2 failed:', data.error || 'Unknown error');
  }

  return status === 200 && data.success;
}

/**
 * Test 3: Get P&L with currency filter
 */
async function testProfitAndLossWithCurrency() {
  console.log('\n📊 Test 3: GET /api/finance/profit-loss?currency=USD');
  console.log('=' .repeat(60));

  const { status, data } = await request('/api/finance/profit-loss?currency=USD', {
    method: 'GET',
  });

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success) {
    console.log('✅ Test 3 passed: Retrieved P&L with currency filter');
    console.log(`   - Currency: ${data.data.filters.currency}`);
    console.log(`   - Net Profit: ${data.data.summary.netProfitCents} cents`);
  } else {
    console.log('❌ Test 3 failed:', data.error || 'Unknown error');
  }

  return status === 200 && data.success;
}

/**
 * Test 4: Get P&L without breakdown
 */
async function testProfitAndLossWithoutBreakdown() {
  console.log('\n📊 Test 4: GET /api/finance/profit-loss?includeBreakdown=false');
  console.log('=' .repeat(60));

  const { status, data } = await request('/api/finance/profit-loss?includeBreakdown=false', {
    method: 'GET',
  });

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success) {
    const hasBreakdown = data.data.breakdown !== undefined;
    if (!hasBreakdown) {
      console.log('✅ Test 4 passed: Retrieved P&L without breakdown');
      console.log(`   - Summary only: ${JSON.stringify(data.data.summary)}`);
    } else {
      console.log('❌ Test 4 failed: Breakdown should not be included');
    }
    return !hasBreakdown;
  } else {
    console.log('❌ Test 4 failed:', data.error || 'Unknown error');
    return false;
  }
}

/**
 * Test 5: Get P&L with all filters combined
 */
async function testProfitAndLossCombinedFilters() {
  console.log('\n📊 Test 5: GET /api/finance/profit-loss with all filters');
  console.log('=' .repeat(60));

  const { status, data } = await request(
    '/api/finance/profit-loss?from=2026-01-01&to=2026-12-31&currency=USD&includeBreakdown=true',
    {
      method: 'GET',
    }
  );

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success) {
    console.log('✅ Test 5 passed: Retrieved P&L with combined filters');
    console.log(`   - Filters: ${JSON.stringify(data.data.filters)}`);
    console.log(`   - Net Profit: ${data.data.summary.netProfitCents} cents`);
    console.log(`   - Has breakdown: ${data.data.breakdown !== undefined}`);
  } else {
    console.log('❌ Test 5 failed:', data.error || 'Unknown error');
  }

  return status === 200 && data.success;
}

/**
 * Test 6: Get P&L summary endpoint (no breakdown)
 */
async function testProfitAndLossSummaryEndpoint() {
  console.log('\n📊 Test 6: GET /api/finance/profit-loss/summary');
  console.log('=' .repeat(60));

  const { status, data } = await request(
    '/api/finance/profit-loss/summary?from=2026-01-01&to=2026-01-31',
    {
      method: 'GET',
    }
  );

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success) {
    const hasBreakdown = data.data.breakdown !== undefined;
    const hasFilters = data.data.filters !== undefined;
    const hasSummary = data.data.summary !== undefined;
    
    if (!hasBreakdown && hasFilters && hasSummary) {
      console.log('✅ Test 6 passed: Retrieved summary-only P&L');
      console.log(`   - Has filters: ${hasFilters}`);
      console.log(`   - Has summary: ${hasSummary}`);
      console.log(`   - No breakdown: ${!hasBreakdown}`);
    } else {
      console.log('❌ Test 6 failed: Summary endpoint should have filters and summary but no breakdown');
    }
    return !hasBreakdown && hasFilters && hasSummary;
  } else {
    console.log('❌ Test 6 failed:', data.error || 'Unknown error');
    return false;
  }
}

/**
 * Test 7: Validate invalid date format
 */
async function testInvalidDateValidation() {
  console.log('\n📊 Test 7: GET /api/finance/profit-loss with invalid date');
  console.log('=' .repeat(60));

  const { status, data } = await request(
    '/api/finance/profit-loss?from=invalid-date',
    {
      method: 'GET',
    }
  );

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 400 && data.success === false && data.error) {
    console.log('✅ Test 7 passed: Invalid date properly rejected');
    console.log(`   - Error message: ${data.error}`);
  } else {
    console.log('❌ Test 7 failed: Should return 400 with error message');
  }

  return status === 400 && data.success === false;
}

/**
 * Test 8: Validate date range (from > to)
 */
async function testInvalidDateRange() {
  console.log('\n📊 Test 8: GET /api/finance/profit-loss with invalid date range');
  console.log('=' .repeat(60));

  const { status, data } = await request(
    '/api/finance/profit-loss?from=2026-12-31&to=2026-01-01',
    {
      method: 'GET',
    }
  );

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 400 && data.success === false && data.error) {
    console.log('✅ Test 8 passed: Invalid date range properly rejected');
    console.log(`   - Error message: ${data.error}`);
  } else {
    console.log('❌ Test 8 failed: Should return 400 with error message');
  }

  return status === 400 && data.success === false;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Starting Profit & Loss API Tests');
  console.log('=' .repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Token: ${TOKEN.substring(0, 20)}...`);

  const results = [];

  try {
    results.push(await testBasicProfitAndLoss());
    results.push(await testProfitAndLossWithDateRange());
    results.push(await testProfitAndLossWithCurrency());
    results.push(await testProfitAndLossWithoutBreakdown());
    results.push(await testProfitAndLossCombinedFilters());
    results.push(await testProfitAndLossSummaryEndpoint());
    results.push(await testInvalidDateValidation());
    results.push(await testInvalidDateRange());
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error.message);
    process.exit(1);
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  const passed = results.filter((r) => r).length;
  const failed = results.length - passed;
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

// Run tests
runAllTests();
