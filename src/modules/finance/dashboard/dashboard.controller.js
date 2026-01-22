import * as dashboardService from './dashboard.service.js';
import { asyncHandler, ValidationError } from '../../../utils/errors.js';

/**
 * Parse and validate date input
 * Accepts:
 *   - YYYY-MM-DD format (e.g., "2026-01-15")
 *   - Full ISO datetime (e.g., "2026-01-15T10:30:00Z")
 * Returns Date object or throws ValidationError
 */
const parseAndValidateDate = (dateString, fieldName) => {
  if (!dateString) return null; // Optional parameter
  
  // Check for YYYY-MM-DD format
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  // Check for ISO datetime format
  const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  
  if (!dateOnlyPattern.test(dateString) && !isoDateTimePattern.test(dateString)) {
    throw new ValidationError(
      `Invalid ${fieldName} format. Expected YYYY-MM-DD or ISO datetime (e.g., 2026-01-15 or 2026-01-15T10:30:00Z)`
    );
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid ${fieldName} value. Could not parse date: ${dateString}`);
  }
  
  return date;
};

/**
 * Get Financial Dashboard
 * Combines KPIs from profit-loss and recent transactions from statements
 * 
 * @route GET /api/finance/dashboard
 * @access ADMIN, SUPER_ADMIN
 * 
 * ============================================================================
 * QUERY PARAMETERS
 * ============================================================================
 * - from: Start date. Accepts YYYY-MM-DD or ISO datetime (e.g., 2026-01-01 or 2026-01-01T00:00:00Z)
 *         Default: start of current month (UTC)
 * - to: End date. Accepts YYYY-MM-DD or ISO datetime (e.g., 2026-01-31 or 2026-01-31T23:59:59Z)
 *       Default: now
 * - currency: Optional currency filter (e.g., USD)
 * - limit: Number of recent transactions to return (1-100, default: 10)
 * 
 * ============================================================================
 * MANUAL TESTING STEPS
 * ============================================================================
 * 
 * Step 1: Test dashboard with default range (current month)
 * --------------------------------------------------------
 * curl -X GET "http://localhost:5001/api/finance/dashboard" \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 * 
 * Step 2: Test dashboard with explicit date range
 * ------------------------------------------------
 * curl -X GET "http://localhost:5001/api/finance/dashboard?from=2026-01-01&to=2026-01-31&limit=5" \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 * 
 * Step 3: Test with ISO datetime format
 * --------------------------------------
 * curl -X GET "http://localhost:5001/api/finance/dashboard?from=2026-01-01T00:00:00Z&to=2026-01-15T23:59:59Z" \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 * 
 * Step 4: Test with currency filter
 * ----------------------------------
 * curl -X GET "http://localhost:5001/api/finance/dashboard?currency=USD&limit=10" \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 * 
 * ============================================================================
 * VERIFICATION: Compare with individual endpoints
 * ============================================================================
 * 
 * IMPORTANT: Dashboard values MUST match calling endpoints separately!
 * 
 * Test A: Verify KPIs match profit-loss endpoint
 * -----------------------------------------------
 * 1. Call dashboard:
 *    curl -X GET "http://localhost:5001/api/finance/dashboard?from=2026-01-01&to=2026-01-31" \
 *      -H "Authorization: Bearer YOUR_TOKEN"
 *    
 *    Extract: data.kpis.totalIncomeCents, totalExpensesCents, netProfitCents
 * 
 * 2. Call profit-loss with SAME parameters:
 *    curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-01-31" \
 *      -H "Authorization: Bearer YOUR_TOKEN"
 *    
 *    Extract: data.totalIncomeCents, totalExpensesCents, netProfitCents
 * 
 * 3. Compare: Values MUST be identical!
 *    ✅ If match: Dashboard is correctly reusing profit-loss logic
 *    ❌ If mismatch: Bug in parameter passing or logic
 * 
 * Test B: Verify transactions match statements endpoint
 * ------------------------------------------------------
 * 1. Call dashboard:
 *    curl -X GET "http://localhost:5001/api/finance/dashboard?from=2026-01-01&to=2026-01-31&limit=10" \
 *      -H "Authorization: Bearer YOUR_TOKEN"
 *    
 *    Extract: data.recentTransactions (array of 10 items)
 * 
 * 2. Call statements with SAME parameters:
 *    curl -X GET "http://localhost:5001/api/finance/statements?from=2026-01-01&to=2026-01-31&pageSize=10" \
 *      -H "Authorization: Bearer YOUR_TOKEN"
 *    
 *    Extract: data (array of items)
 * 
 * 3. Compare: First N transactions MUST match (id, date, type, amountCents)
 *    ✅ If match: Dashboard is correctly reusing statements logic
 *    ❌ If mismatch: Check sorting and pagination
 * 
 * ============================================================================
 * SAMPLE JSON RESPONSE
 * ============================================================================
 * {
 *   "success": true,
 *   "data": {
 *     "range": {
 *       "from": "2026-01-01T00:00:00.000Z",
 *       "to": "2026-01-31T23:59:59.999Z"
 *     },
 *     "kpis": {
 *       "totalIncomeCents": 250000,        // $2,500.00 total income
 *       "totalExpensesCents": 125000,      // $1,250.00 total expenses
 *       "netProfitCents": 125000,          // $1,250.00 net profit
 *       "pendingPayables": {               // Structured payables object
 *         "count": 3,                      // 3 pending payables
 *         "amountCents": 50000,            // $500.00 outstanding (sum of amount - paid)
 *         "currency": "PKR"                // Currency (PKR or filtered currency)
 *       },
 *       "overduePayables": {               // Structured overdue payables object
 *         "count": 1,                      // 1 overdue payable
 *         "amountCents": 10000,            // $100.00 outstanding
 *         "currency": "PKR"
 *       },
 *       "pendingPayablesCents": 50000,     // DEPRECATED: Legacy field for backward compatibility
 *       "overduePayablesCents": 10000,     // DEPRECATED: Legacy field for backward compatibility
 *       "netCashFlowCents": 115000,        // $1,150.00 net cash movement (in - out)
 *       "inventoryValueCents": 0           // $0.00 (placeholder for future)
 *     },
 *     "recentTransactions": [
 *       {
 *         "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *         "date": "2026-01-15T10:30:00.000Z",
 *         "type": "INCOME",
 *         "description": "Client payment for booking #123",
 *         "amountCents": 50000,            // $500.00
 *         "currency": "USD",
 *         "direction": "in",
 *         "referenceId": "booking-123"
 *       },
 *       {
 *         "id": "b2c3d4e5-f6g7-8901-bcde-f12345678901",
 *         "date": "2026-01-14T14:20:00.000Z",
 *         "type": "EXPENSE",
 *         "description": "Office supplies",
 *         "amountCents": 15000,            // $150.00
 *         "currency": "USD",
 *         "direction": "out",
 *         "referenceId": null
 *       },
 *       {
 *         "id": "c3d4e5f6-g7h8-9012-cdef-123456789012",
 *         "date": "2026-01-13T09:00:00.000Z",
 *         "type": "PURCHASE",
 *         "description": "Purchase from Vendor ABC",
 *         "amountCents": 75000,            // $750.00
 *         "currency": "USD",
 *         "direction": "out",
 *         "referenceId": "purchase-456"
 *       }
 *     ]
 *   }
 * }
 * 
 * ============================================================================
 * FRONTEND INTEGRATION NOTES
 * ============================================================================
 * 
 * Converting cents to dollars:
 * ----------------------------
 * const dollars = amountCents / 100;
 * const formatted = `$${dollars.toFixed(2)}`;
 * 
 * Example mapping for dashboard display:
 * --------------------------------------
 * const dashboardData = response.data;
 * 
 * // Display KPIs
 * const totalIncome = dashboardData.kpis.totalIncomeCents / 100;     // $2,500.00
 * const totalExpenses = dashboardData.kpis.totalExpensesCents / 100; // $1,250.00
 * const netProfit = dashboardData.kpis.netProfitCents / 100;         // $1,250.00
 * 
 * // Display pending payables (NEW structured format)
 * const pendingPayables = dashboardData.kpis.pendingPayables;
 * console.log(`${pendingPayables.count} pending payables totaling ${pendingPayables.currency} ${pendingPayables.amountCents / 100}`);
 * // Output: "3 pending payables totaling PKR 500.00"
 * 
 * // Legacy format (DEPRECATED but still available)
 * const pendingAmount = dashboardData.kpis.pendingPayablesCents / 100; // $500.00
 * 
 * // Display recent transactions
 * dashboardData.recentTransactions.forEach(tx => {
 *   const amount = tx.amountCents / 100;
 *   const sign = tx.direction === 'in' ? '+' : '-';
 *   console.log(`${sign}$${amount.toFixed(2)} - ${tx.description}`);
 * });
 * 
 * // Date range display
 * const fromDate = new Date(dashboardData.range.from).toLocaleDateString();
 * const toDate = new Date(dashboardData.range.to).toLocaleDateString();
 * console.log(`Report Period: ${fromDate} to ${toDate}`);
 * 
 * ============================================================================
 * IMPORTANT NOTES
 * ============================================================================
 * - All amounts are in CENTS to avoid floating-point precision issues
 * - Soft-deleted records are automatically excluded
 * - Currency filter is optional - if omitted, includes all currencies
 * - Date defaults to "this month" (start of current month UTC to now)
 * - Recent transactions are sorted by date DESC (newest first)
 * - KPIs match exactly what /api/finance/profit-loss returns
 * - Transactions match exactly what /api/finance/statements returns
 */
export const getDashboard = asyncHandler(async (req, res) => {
  try {
    let { from, to, currency, limit } = req.query;

    // ============================================
    // FIX: Normalize empty strings to undefined
    // Empty strings from frontend can cause query issues
    // ============================================
    if (from === '') from = undefined;
    if (to === '') to = undefined;
    if (currency === '') currency = undefined;
    if (limit === '') limit = undefined;

    console.log('[Dashboard] Query params:', { from, to, currency, limit });

  // ============================================
  // PARSE AND VALIDATE DATE PARAMETERS
  // ============================================
  let fromDate = null;
  let toDate = null;
  
  try {
    fromDate = parseAndValidateDate(from, 'from');
    toDate = parseAndValidateDate(to, 'to');
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    throw error; // Re-throw unexpected errors
  }

  // Validate date range
  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({
      success: false,
      message: 'From date must be before or equal to to date',
    });
  }

  // Validate currency format if provided
  if (currency) {
    if (typeof currency !== 'string' || currency.trim().length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Currency must be a 3-character code (e.g., USD, EUR)',
      });
    }
  }

  // Normalize currency to uppercase (matches profit-loss and statements behavior)
  const normalizedCurrency = currency ? String(currency).trim().toUpperCase() : undefined;

  // Validate limit parameter - safely parse string to integer
  let limitNum = 10; // Default
  if (limit !== undefined) {
    const parsed = Number.parseInt(String(limit), 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a number between 1 and 100',
      });
    }
    limitNum = parsed;
  }

  // Get dashboard data from service
  // Pass Date objects (or null) to service
  const dashboardData = await dashboardService.getDashboardData({
    fromDate,
    toDate,
    currency: normalizedCurrency,
    limit: limitNum,
  });

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('[Dashboard] Error:', error.message);
    console.error('[Dashboard] Stack:', error.stack);
    throw error; // Let asyncHandler handle it
  }
});
