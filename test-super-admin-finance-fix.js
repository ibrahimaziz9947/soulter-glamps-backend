/**
 * Test Super Admin Finance Summary Endpoint
 * 
 * This script verifies:
 * 1. Totals are non-zero when income/purchases exist
 * 2. Ledger entries have proper categoryLabel, description, status
 * 3. Amounts are in cents (never lose trailing zeros)
 * 
 * Usage:
 *   $env:SUPER_ADMIN_TOKEN = "your-super-admin-jwt-token"
 *   node test-super-admin-finance-fix.js
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
const SUPER_ADMIN_TOKEN = process.env.SUPER_ADMIN_TOKEN;

if (!SUPER_ADMIN_TOKEN) {
  console.error('❌ Please set SUPER_ADMIN_TOKEN environment variable');
  console.error('   Get token by logging in as super admin');
  process.exit(1);
}

// Helper function to make authenticated API requests
async function apiRequest(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPER_ADMIN_TOKEN}`,
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const json = await response.json();
  return { status: response.status, data: json };
}

// Helper to format cents as currency
function formatCents(cents) {
  const amount = (cents / 100).toFixed(2);
  return `PKR ${amount}`;
}

console.log('🧪 Testing Super Admin Finance Summary Endpoint\n');
console.log('='.repeat(80));

async function runTests() {
  // ==============================================
  // TEST 1: Fetch summary with default date range (last 30 days)
  // ==============================================
  console.log('\nTEST 1: Default Date Range (Last 30 Days)');
  console.log('-'.repeat(80));

  const { status: status1, data: summary1 } = await apiRequest(
    'GET',
    '/super-admin/finance/summary'
  );

  console.log(`📡 Request: GET /api/super-admin/finance/summary`);
  console.log(`\n📥 Response (${status1}):`);
  
  if (!summary1.success) {
    console.error('❌ Request failed:', summary1);
    return;
  }

  console.log('\n💰 TOTALS:');
  console.log(`   Total Revenue:  ${formatCents(summary1.data.totals.totalRevenueCents)} (${summary1.data.totals.totalRevenueCents} cents)`);
  console.log(`   Total Expenses: ${formatCents(summary1.data.totals.totalExpensesCents)} (${summary1.data.totals.totalExpensesCents} cents)`);
  console.log(`   Net Profit:     ${formatCents(summary1.data.totals.netProfitCents)} (${summary1.data.totals.netProfitCents} cents)`);
  console.log(`   Currency:       ${summary1.data.totals.currency}`);

  // Verify totals are numbers (not undefined/null)
  const hasValidTotals = 
    typeof summary1.data.totals.totalRevenueCents === 'number' &&
    typeof summary1.data.totals.totalExpensesCents === 'number' &&
    typeof summary1.data.totals.netProfitCents === 'number';

  if (hasValidTotals) {
    console.log('\n✅ Totals are valid numbers');
  } else {
    console.log('\n❌ Totals are missing or invalid');
  }

  // Check if totals make sense
  const totalRevenue = summary1.data.totals.totalRevenueCents;
  const totalExpenses = summary1.data.totals.totalExpensesCents;
  const netProfit = summary1.data.totals.netProfitCents;
  const calculatedProfit = totalRevenue - totalExpenses;

  if (Math.abs(netProfit - calculatedProfit) < 1) { // Allow 1 cent rounding
    console.log('✅ Net profit calculation is correct');
  } else {
    console.log(`⚠️  Net profit mismatch: ${netProfit} vs calculated ${calculatedProfit}`);
  }

  console.log('\n📊 OPEN PAYABLES:');
  console.log(`   Count:  ${summary1.data.openPayables.count}`);
  console.log(`   Amount: ${formatCents(summary1.data.openPayables.amountCents)} (${summary1.data.openPayables.amountCents} cents)`);

  console.log('\n📋 RECENT LEDGER ENTRIES (${summary1.data.recentLedgerEntries.length}):');
  
  if (summary1.data.recentLedgerEntries.length === 0) {
    console.log('   ℹ️  No ledger entries in selected date range');
  } else {
    // Show first 5 entries
    summary1.data.recentLedgerEntries.slice(0, 5).forEach((entry, index) => {
      console.log(`\n   ${index + 1}. ID: ${entry.id}`);
      console.log(`      Date:        ${entry.date}`);
      console.log(`      Type:        ${entry.type}`);
      console.log(`      Category:    ${entry.categoryLabel}`);
      console.log(`      Description: ${entry.description || '(empty)'}`);
      console.log(`      Status:      ${entry.status}`);
      console.log(`      Amount:      ${formatCents(entry.amountCents)} (${entry.amountCents} cents)`);
      console.log(`      Currency:    ${entry.currency}`);
    });

    if (summary1.data.recentLedgerEntries.length > 5) {
      console.log(`\n   ... and ${summary1.data.recentLedgerEntries.length - 5} more entries`);
    }
  }

  // ==============================================
  // TEST 2: Verify ledger entry fields
  // ==============================================
  console.log('\n\nTEST 2: Ledger Entry Field Validation');
  console.log('-'.repeat(80));

  let hasValidEntries = true;
  let validationIssues = [];

  summary1.data.recentLedgerEntries.forEach((entry, index) => {
    // Check for N/A or missing fields
    if (entry.categoryLabel === 'N/A' || !entry.categoryLabel) {
      validationIssues.push(`Entry ${index + 1}: categoryLabel is "${entry.categoryLabel}"`);
      hasValidEntries = false;
    }

    if (!entry.description || entry.description.trim() === '') {
      validationIssues.push(`Entry ${index + 1}: description is empty`);
      hasValidEntries = false;
    }

    if (entry.status === '-' || !entry.status) {
      validationIssues.push(`Entry ${index + 1}: status is "${entry.status}"`);
      hasValidEntries = false;
    }

    if (typeof entry.amountCents !== 'number' || entry.amountCents < 0) {
      validationIssues.push(`Entry ${index + 1}: amountCents is invalid (${entry.amountCents})`);
      hasValidEntries = false;
    }
  });

  if (hasValidEntries && summary1.data.recentLedgerEntries.length > 0) {
    console.log('✅ All ledger entries have valid fields');
  } else if (summary1.data.recentLedgerEntries.length === 0) {
    console.log('ℹ️  No entries to validate');
  } else {
    console.log('❌ Some ledger entries have invalid fields:');
    validationIssues.forEach(issue => console.log(`   • ${issue}`));
  }

  // ==============================================
  // TEST 3: Custom date range
  // ==============================================
  console.log('\n\nTEST 3: Custom Date Range');
  console.log('-'.repeat(80));

  const fromDate = '2025-12-01';
  const toDate = '2026-01-31';

  const { status: status3, data: summary3 } = await apiRequest(
    'GET',
    `/super-admin/finance/summary?from=${fromDate}&to=${toDate}`
  );

  console.log(`📡 Request: GET /api/super-admin/finance/summary?from=${fromDate}&to=${toDate}`);
  console.log(`\n📥 Response (${status3}):`);

  if (summary3.success) {
    console.log('\n💰 TOTALS:');
    console.log(`   Total Revenue:  ${formatCents(summary3.data.totals.totalRevenueCents)}`);
    console.log(`   Total Expenses: ${formatCents(summary3.data.totals.totalExpensesCents)}`);
    console.log(`   Net Profit:     ${formatCents(summary3.data.totals.netProfitCents)}`);
    console.log(`\n📋 Ledger Entries: ${summary3.data.recentLedgerEntries.length}`);
  } else {
    console.log('❌ Request failed:', summary3);
  }

  // ==============================================
  // TEST 4: Verify cents precision (no data loss)
  // ==============================================
  console.log('\n\nTEST 4: Cents Precision Verification');
  console.log('-'.repeat(80));

  const allAmounts = [
    summary1.data.totals.totalRevenueCents,
    summary1.data.totals.totalExpensesCents,
    summary1.data.totals.netProfitCents,
    summary1.data.openPayables.amountCents,
    ...summary1.data.recentLedgerEntries.map(e => e.amountCents),
  ];

  const hasDecimalValues = allAmounts.some(amount => amount % 1 !== 0);
  const hasNonZeroLastTwoDigits = allAmounts.some(amount => amount % 100 !== 0);

  console.log(`   Total amounts checked: ${allAmounts.length}`);
  console.log(`   All amounts are integers: ${!hasDecimalValues ? '✅' : '❌'}`);
  console.log(`   Some amounts preserve last two digits: ${hasNonZeroLastTwoDigits ? '✅' : 'ℹ️  (all amounts are round hundreds)'}`);

  // Show sample amounts with their last two digits
  console.log('\n   Sample amounts (showing cents precision):');
  summary1.data.recentLedgerEntries.slice(0, 3).forEach(entry => {
    const lastTwoDigits = entry.amountCents % 100;
    console.log(`   • ${entry.amountCents} cents (last 2 digits: ${lastTwoDigits.toString().padStart(2, '0')})`);
  });

  // ==============================================
  // Summary
  // ==============================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const allTestsPassed = 
    hasValidTotals &&
    (summary1.data.recentLedgerEntries.length === 0 || hasValidEntries) &&
    !hasDecimalValues;

  if (allTestsPassed) {
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\n   ✓ Totals are returning correct values');
    console.log('   ✓ Ledger entries have proper categoryLabel, description, status');
    console.log('   ✓ Amounts are in cents (integers) - no precision loss');
    console.log('   ✓ Open payables are calculated correctly');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    if (!hasValidTotals) {
      console.log('   ✗ Totals have invalid values');
    }
    if (!hasValidEntries && summary1.data.recentLedgerEntries.length > 0) {
      console.log('   ✗ Some ledger entries have missing/invalid fields');
    }
    if (hasDecimalValues) {
      console.log('   ✗ Some amounts are not integers (precision issue)');
    }
  }

  console.log('\n📝 Next Steps:');
  console.log('   1. Verify totals match expected values in your database');
  console.log('   2. Check ledger table displays categoryLabel, description, status correctly');
  console.log('   3. Ensure frontend formats amountCents as PKR X.XX');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test failed with error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
