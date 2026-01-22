/**
 * Money Utility - Canonical currency conversion
 * 
 * Contract:
 * - Database stores ALL amounts as integers in MINOR UNITS (cents/paisas)
 * - API accepts amounts in MAJOR UNITS (PKR, USD, etc.) from clients
 * - API returns amounts in MAJOR UNITS (PKR, USD, etc.) to clients
 * - This utility handles the conversion consistently
 * 
 * Example:
 * - User enters: 45000 PKR
 * - toCents(45000, 'PKR') => 4500000 paisas (store in DB)
 * - fromCents(4500000, 'PKR') => 45000 PKR (return from API)
 */

/**
 * Currency configuration
 * Defines the decimal places (minor unit factor) for each currency
 */
const CURRENCY_CONFIG = {
  PKR: { minorUnits: 2, factor: 100 }, // 1 PKR = 100 paisas
  USD: { minorUnits: 2, factor: 100 }, // 1 USD = 100 cents
  EUR: { minorUnits: 2, factor: 100 }, // 1 EUR = 100 cents
  GBP: { minorUnits: 2, factor: 100 }, // 1 GBP = 100 pence
  // Add more currencies as needed
};

/**
 * Get currency configuration
 * @param {string} currency - Currency code (e.g., 'PKR', 'USD')
 * @returns {object} Currency config
 */
function getCurrencyConfig(currency) {
  const currencyUpper = (currency || 'PKR').toUpperCase();
  return CURRENCY_CONFIG[currencyUpper] || CURRENCY_CONFIG.PKR;
}

/**
 * Convert major units to minor units (cents/paisas)
 * Use this when SAVING to database
 * 
 * @param {number} amountMajor - Amount in major units (e.g., 45000 PKR)
 * @param {string} currency - Currency code (default: 'PKR')
 * @returns {number} Amount in minor units (e.g., 4500000 paisas)
 * 
 * @example
 * toCents(45000, 'PKR')    // => 4500000
 * toCents(20000, 'PKR')    // => 2000000
 * toCents(1547.50, 'PKR')  // => 154750
 */
export function toCents(amountMajor, currency = 'PKR') {
  if (amountMajor === null || amountMajor === undefined) {
    return 0;
  }
  
  const config = getCurrencyConfig(currency);
  return Math.round(amountMajor * config.factor);
}

/**
 * Convert minor units to major units
 * Use this when READING from database for API responses
 * 
 * @param {number} amountCents - Amount in minor units (e.g., 4500000 paisas)
 * @param {string} currency - Currency code (default: 'PKR')
 * @returns {number} Amount in major units (e.g., 45000 PKR)
 * 
 * @example
 * fromCents(4500000, 'PKR')  // => 45000
 * fromCents(2000000, 'PKR')  // => 20000
 * fromCents(154750, 'PKR')   // => 1547.50
 */
export function fromCents(amountCents, currency = 'PKR') {
  if (amountCents === null || amountCents === undefined) {
    return 0;
  }
  
  const config = getCurrencyConfig(currency);
  return amountCents / config.factor;
}

/**
 * Format amount for display (with currency symbol and proper decimals)
 * 
 * @param {number} amountCents - Amount in minor units
 * @param {string} currency - Currency code (default: 'PKR')
 * @param {boolean} showSymbol - Whether to include currency symbol (default: true)
 * @returns {string} Formatted amount (e.g., "PKR 45,000.00")
 * 
 * @example
 * formatMoney(4500000, 'PKR')     // => "PKR 45,000.00"
 * formatMoney(4500000, 'PKR', false)  // => "45,000.00"
 */
export function formatMoney(amountCents, currency = 'PKR', showSymbol = true) {
  const config = getCurrencyConfig(currency);
  const amountMajor = amountCents / config.factor;
  
  const formatted = amountMajor.toLocaleString('en-PK', {
    minimumFractionDigits: config.minorUnits,
    maximumFractionDigits: config.minorUnits,
  });
  
  return showSymbol ? `${currency.toUpperCase()} ${formatted}` : formatted;
}

/**
 * Validate and normalize currency code
 * 
 * @param {string} currency - Currency code
 * @returns {string} Uppercase currency code
 * @throws {Error} If currency is invalid
 */
export function normalizeCurrency(currency) {
  if (!currency || typeof currency !== 'string') {
    return 'PKR'; // Default
  }
  
  const currencyUpper = currency.toUpperCase();
  
  if (!CURRENCY_CONFIG[currencyUpper]) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  
  return currencyUpper;
}

/**
 * Create a money object with both representations
 * Useful for API responses that want to return both formats
 * 
 * @param {number} amountCents - Amount in minor units
 * @param {string} currency - Currency code
 * @returns {object} Object with both amountCents and amount
 * 
 * @example
 * createMoneyObject(4500000, 'PKR')
 * // => { amount: 45000, amountCents: 4500000, currency: 'PKR' }
 */
export function createMoneyObject(amountCents, currency = 'PKR') {
  return {
    amount: fromCents(amountCents, currency),
    amountCents,
    currency: normalizeCurrency(currency),
  };
}

export default {
  toCents,
  fromCents,
  formatMoney,
  normalizeCurrency,
  createMoneyObject,
};
