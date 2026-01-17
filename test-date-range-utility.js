/**
 * Test script for parseDateRange utility
 * Tests edge cases and error handling
 */

import { parseDateRange } from './src/utils/dateRange.js';

console.log('========================================');
console.log('🧪 parseDateRange Utility Tests');
console.log('========================================\n');

let passed = 0;
let failed = 0;

/**
 * Test helper
 */
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
  }
}

// Test 1: Default range (30 days)
test('Default range (no params)', () => {
  const result = parseDateRange(undefined, undefined, 30);
  if (!result.from || !result.to) throw new Error('Missing dates');
  if (!(result.from instanceof Date)) throw new Error('from is not a Date');
  if (!(result.to instanceof Date)) throw new Error('to is not a Date');
  if (!result.fromISO || !result.toISO) throw new Error('Missing ISO strings');
  console.log(`   Range: ${result.fromISO} to ${result.toISO}`);
});

// Test 2: YYYY-MM-DD format
test('YYYY-MM-DD format', () => {
  const result = parseDateRange('2026-01-01', '2026-01-31');
  if (result.fromISO !== '2026-01-01T00:00:00.000Z') {
    throw new Error(`Expected 2026-01-01T00:00:00.000Z, got ${result.fromISO}`);
  }
  if (result.toISO !== '2026-01-31T23:59:59.999Z') {
    throw new Error(`Expected 2026-01-31T23:59:59.999Z, got ${result.toISO}`);
  }
  console.log(`   Range: ${result.fromISO} to ${result.toISO}`);
});

// Test 3: ISO datetime format
test('ISO datetime format', () => {
  const result = parseDateRange('2026-01-01T10:00:00Z', '2026-01-31T18:00:00Z');
  if (result.fromISO !== '2026-01-01T10:00:00.000Z') {
    throw new Error(`Expected 2026-01-01T10:00:00.000Z, got ${result.fromISO}`);
  }
  if (result.toISO !== '2026-01-31T18:00:00.000Z') {
    throw new Error(`Expected 2026-01-31T18:00:00.000Z, got ${result.toISO}`);
  }
  console.log(`   Range: ${result.fromISO} to ${result.toISO}`);
});

// Test 4: Empty strings treated as undefined
test('Empty strings treated as undefined', () => {
  const result = parseDateRange('', '', 7);
  if (!result.from || !result.to) throw new Error('Missing dates');
  console.log(`   Defaulted to 7-day range`);
});

// Test 5: Custom default days
test('Custom default days (7)', () => {
  const result = parseDateRange(undefined, undefined, 7);
  const daysDiff = Math.round((result.to - result.from) / (1000 * 60 * 60 * 24));
  // Allow for 7-8 days due to partial day rounding
  if (daysDiff < 7 || daysDiff > 8) {
    throw new Error(`Expected ~7 days, got ${daysDiff}`);
  }
  console.log(`   7-day range verified (${daysDiff} days)`);
});

// Test 6: Invalid date format should throw
test('Invalid date format throws error', () => {
  try {
    parseDateRange('invalid-date', '2026-01-31');
    throw new Error('Should have thrown error for invalid date');
  } catch (error) {
    if (error.statusCode !== 400) {
      throw new Error('Should throw 400 error');
    }
    if (!error.message.includes('Invalid date format')) {
      throw new Error('Error message should mention invalid format');
    }
  }
  console.log(`   Correctly threw 400 error`);
});

// Test 7: from > to should throw
test('from > to throws error', () => {
  try {
    parseDateRange('2026-02-01', '2026-01-01');
    throw new Error('Should have thrown error for from > to');
  } catch (error) {
    if (error.statusCode !== 400) {
      throw new Error('Should throw 400 error');
    }
    if (!error.message.includes('before or equal')) {
      throw new Error('Error message should mention date order');
    }
  }
  console.log(`   Correctly threw 400 error`);
});

// Test 8: Only from provided should throw
test('Only from (no to) throws error', () => {
  try {
    parseDateRange('2026-01-01', undefined);
    throw new Error('Should have thrown error for missing to date');
  } catch (error) {
    if (error.statusCode !== 400) {
      throw new Error('Should throw 400 error');
    }
    if (!error.message.includes("'to' date is required")) {
      throw new Error('Error message should mention missing to date');
    }
  }
  console.log(`   Correctly threw 400 error`);
});

// Test 9: Only to provided should throw
test('Only to (no from) throws error', () => {
  try {
    parseDateRange(undefined, '2026-01-31');
    throw new Error('Should have thrown error for missing from date');
  } catch (error) {
    if (error.statusCode !== 400) {
      throw new Error('Should throw 400 error');
    }
    if (!error.message.includes("'from' date is required")) {
      throw new Error('Error message should mention missing from date');
    }
  }
  console.log(`   Correctly threw 400 error`);
});

// Test 10: Same day range
test('Same day (from === to)', () => {
  const result = parseDateRange('2026-01-15', '2026-01-15');
  if (result.fromISO !== '2026-01-15T00:00:00.000Z') {
    throw new Error(`Expected start of day, got ${result.fromISO}`);
  }
  if (result.toISO !== '2026-01-15T23:59:59.999Z') {
    throw new Error(`Expected end of day, got ${result.toISO}`);
  }
  console.log(`   Single day range: ${result.fromISO} to ${result.toISO}`);
});

console.log('\n========================================');
console.log('📊 Test Summary:');
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All utility tests passed!\n');
  process.exit(0);
}
