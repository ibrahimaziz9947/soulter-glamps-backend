/**
 * Verify Money Fix - Check No Conversions
 * 
 * Verifies that NO toCents/fromCents conversions exist in services
 */

import fs from 'fs';

console.log('========================================');
console.log('🔍 VERIFYING NO MONEY CONVERSIONS');
console.log('========================================\n');

const servicesToCheck = [
  'src/modules/finance/income/income.service.js',
  'src/modules/finance/purchases/purchase.service.js',
  'src/modules/finance/expenses/expense.service.js',
  'src/modules/finance/profitLoss/profitLoss.service.js',
  'src/modules/finance/dashboard/dashboard.service.js',
  'src/modules/super-admin/dashboard/super-admin-dashboard.service.js',
];

let allGood = true;

servicesToCheck.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const hasToCents = /toCents\(/.test(content);
  const hasFromCents = /fromCents\(/.test(content);
  const importsMoneyUtil = /from.*money\.js/.test(content);
  
  console.log(`📄 ${file.split('/').pop()}`);
  
  if (importsMoneyUtil) {
    console.log('  ⚠️  Still imports money utility');
    allGood = false;
  }
  if (hasToCents) {
    console.log('  ❌ Still uses toCents()');
    allGood = false;
  }
  if (hasFromCents) {
    console.log('  ❌ Still uses fromCents()');
    allGood = false;
  }
  
  if (!importsMoneyUtil && !hasToCents && !hasFromCents) {
    console.log('  ✅ No conversions (correct!)');
  }
  console.log('');
});

console.log('========================================');
if (allGood) {
  console.log('✅ ALL SERVICES USE RAW VALUES');
  console.log('\nNo money conversions found.');
  console.log('All amounts stored/returned as major units (PKR).');
} else {
  console.log('⚠️  SOME SERVICES STILL HAVE CONVERSIONS');
  console.log('\nPlease remove remaining toCents/fromCents calls.');
}
console.log('========================================\n');
