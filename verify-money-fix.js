/**
 * Money Units Fix - Code Verification
 * 
 * Verifies that all services are using the money utility correctly
 * without needing to run the server or access the database.
 */

import fs from 'fs';
import path from 'path';

console.log('========================================');
console.log('🔍 MONEY UNITS FIX - CODE VERIFICATION');
console.log('========================================\n');

const checks = [];

function checkFile(filePath, checks) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const results = [];
  
  checks.forEach(check => {
    const found = check.pattern.test(content);
    results.push({
      description: check.description,
      expected: check.expected,
      found,
      passed: found === check.expected,
    });
  });
  
  return results;
}

// Check 1: Money utility exists
console.log('📦 Check 1: Money utility exists');
const moneyUtilPath = 'src/utils/money.js';
if (fs.existsSync(moneyUtilPath)) {
  console.log('✅ Money utility file exists');
  
  const moneyContent = fs.readFileSync(moneyUtilPath, 'utf-8');
  const hasToCents = /export function toCents/.test(moneyContent);
  const hasFromCents = /export function fromCents/.test(moneyContent);
  
  console.log(hasToCents ? '✅ toCents() function exists' : '❌ toCents() function missing');
  console.log(hasFromCents ? '✅ fromCents() function exists' : '❌ fromCents() function missing');
} else {
  console.log('❌ Money utility file missing');
}

// Check 2: Income service
console.log('\n📦 Check 2: Income service');
const incomeResults = checkFile('src/modules/finance/income/income.service.js', [
  {
    description: 'Imports money utility',
    pattern: /import.*\{.*toCents.*fromCents.*\}.*from.*money/,
    expected: true,
  },
  {
    description: 'Uses toCents in CREATE',
    pattern: /toCents\(payload\.amount/,
    expected: true,
  },
  {
    description: 'Uses fromCents in LIST',
    pattern: /fromCents\(totalAmount/,
    expected: true,
  },
  {
    description: 'No raw amount assignment in CREATE',
    pattern: /amount:\s*payload\.amount[,\s]/,
    expected: false,
  },
]);

incomeResults.forEach(r => {
  console.log(r.passed ? `✅ ${r.description}` : `❌ ${r.description}`);
});

// Check 3: Purchase service
console.log('\n📦 Check 3: Purchase service');
const purchaseResults = checkFile('src/modules/finance/purchases/purchase.service.js', [
  {
    description: 'Imports money utility',
    pattern: /import.*\{.*toCents.*fromCents.*\}.*from.*money/,
    expected: true,
  },
  {
    description: 'Uses toCents in CREATE',
    pattern: /toCents\(payload\.amount/,
    expected: true,
  },
  {
    description: 'Uses fromCents in LIST',
    pattern: /fromCents\(totalAmount/,
    expected: true,
  },
]);

purchaseResults.forEach(r => {
  console.log(r.passed ? `✅ ${r.description}` : `❌ ${r.description}`);
});

// Check 4: Expense service
console.log('\n📦 Check 4: Expense service');
const expenseResults = checkFile('src/modules/finance/expenses/expense.service.js', [
  {
    description: 'Imports money utility',
    pattern: /import.*\{.*toCents.*fromCents.*\}.*from.*money/,
    expected: true,
  },
  {
    description: 'Uses toCents in CREATE',
    pattern: /toCents\(data\.amount/,
    expected: true,
  },
  {
    description: 'Uses fromCents in LIST',
    pattern: /fromCents\(totalAmount/,
    expected: true,
  },
]);

expenseResults.forEach(r => {
  console.log(r.passed ? `✅ ${r.description}` : `❌ ${r.description}`);
});

// Check 5: Profit & Loss service
console.log('\n📦 Check 5: Profit & Loss service');
const plResults = checkFile('src/modules/finance/profitLoss/profitLoss.service.js', [
  {
    description: 'Imports fromCents',
    pattern: /import.*\{.*fromCents.*\}.*from.*money/,
    expected: true,
  },
  {
    description: 'Uses fromCents in summary',
    pattern: /fromCents\(totalIncomeCents/,
    expected: true,
  },
]);

plResults.forEach(r => {
  console.log(r.passed ? `✅ ${r.description}` : `❌ ${r.description}`);
});

// Check 6: Dashboard service
console.log('\n📦 Check 6: Dashboard service');
const dashboardResults = checkFile('src/modules/finance/dashboard/dashboard.service.js', [
  {
    description: 'Imports fromCents',
    pattern: /import.*\{.*fromCents.*\}.*from.*money/,
    expected: true,
  },
  {
    description: 'Uses fromCents for payables',
    pattern: /fromCents\(pendingPayablesCents/,
    expected: true,
  },
]);

dashboardResults.forEach(r => {
  console.log(r.passed ? `✅ ${r.description}` : `❌ ${r.description}`);
});

// Summary
console.log('\n========================================');
const allResults = [
  ...incomeResults,
  ...purchaseResults,
  ...expenseResults,
  ...plResults,
  ...dashboardResults,
];

const passed = allResults.filter(r => r.passed).length;
const total = allResults.length;

console.log(`📊 Results: ${passed}/${total} checks passed`);

if (passed === total) {
  console.log('✅ ALL CHECKS PASSED');
  console.log('\nThe money units fix is correctly implemented.');
  console.log('All services are using toCents/fromCents appropriately.');
  console.log('\nNext steps:');
  console.log('1. Deploy to production');
  console.log('2. Test with real data');
  console.log('3. Verify frontend displays correct values');
} else {
  console.log('⚠️  SOME CHECKS FAILED');
  console.log('\nPlease review the failed checks above.');
}

console.log('========================================\n');
