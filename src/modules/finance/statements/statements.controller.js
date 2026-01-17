import * as statementsService from './statements.service.js';
import { asyncHandler } from '../../../utils/errors.js';

/**
 * Validate ISO date format
 */
const isValidDate = (dateString) => {
  if (!dateString) return true; // Optional parameter
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(dateString);
};

/**
 * Get Financial Statements (Ledger) with unified view of all transactions
 * @route GET /api/finance/statements
 * @access ADMIN, SUPER_ADMIN
 * 
 * Query params:
 * - from: Start date (ISO format, e.g., 2026-01-01)
 * - to: End date (ISO format, e.g., 2026-01-31)
 * - currency: Optional currency filter (e.g., USD)
 * - expenseMode: approvedOnly | includeSubmitted (default: approvedOnly)
 * - includePurchases: Include purchase records (default: true)
 * - includePayments: Include payment records (default: true)
 * - search: Search in title/counterparty/category
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 25)
 * - sort: asc | desc (default: desc)
 * 
 * Note: All amounts are in CENTS. Soft-deleted records are automatically excluded.
 * 
 * Sample curl:
 * curl -X GET "http://localhost:5001/api/finance/statements?from=2026-01-01&to=2026-01-31&page=1&pageSize=25" \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 */
export const getStatements = asyncHandler(async (req, res) => {
  let { 
    from, 
    to, 
    currency, 
    expenseMode, 
    includePurchases, 
    includePayments,
    search,
    page, 
    pageSize, 
    sort 
  } = req.query;

  // ============================================
  // FIX: Normalize empty strings to undefined
  // Empty strings from frontend can cause query issues
  // ============================================
  if (from === '') from = undefined;
  if (to === '') to = undefined;
  if (currency === '') currency = undefined;
  if (expenseMode === '') expenseMode = undefined;
  if (search === '') search = undefined;

  // TEMP LOG: Debug query parameters
  console.log('[Statements] query', req.query);
  console.log('[Statements] normalized', { from, to, currency, expenseMode, search });

  // Validate date parameters
  if (from && !isValidDate(from)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid from date. Expected ISO format (YYYY-MM-DD)',
    });
  }

  if (to && !isValidDate(to)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid to date. Expected ISO format (YYYY-MM-DD)',
    });
  }

  // Validate date range
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        error: 'From date must be before or equal to to date',
      });
    }
  }

  // Validate currency format if provided
  if (currency && (typeof currency !== 'string' || currency.trim().length !== 3)) {
    return res.status(400).json({
      success: false,
      error: 'Currency must be a 3-character code (e.g., USD, EUR)',
    });
  }

  // Validate expenseMode if provided (matches Profit-Loss endpoint)
  // - approvedOnly: Only APPROVED expenses (default)
  // - includeSubmitted: SUBMITTED + APPROVED expenses
  // Note: DRAFT expenses are NEVER included in either mode
  if (expenseMode && !['approvedOnly', 'includeSubmitted'].includes(expenseMode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid expenseMode. Must be "approvedOnly" or "includeSubmitted"',
    });
  }

  // Validate sort if provided
  if (sort && !['asc', 'desc'].includes(sort)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid sort. Must be "asc" or "desc"',
    });
  }

  // Validate pagination
  const pageNum = parseInt(page) || 1;
  const pageSizeNum = parseInt(pageSize) || 25;

  if (pageNum < 1) {
    return res.status(400).json({
      success: false,
      error: 'Page must be >= 1',
    });
  }

  if (isNaN(pageNum) || !Number.isInteger(pageNum)) {
    return res.status(400).json({
      success: false,
      error: 'Page must be a valid integer',
    });
  }

  if (isNaN(pageSizeNum) || !Number.isInteger(pageSizeNum)) {
    return res.status(400).json({
      success: false,
      error: 'Page size must be a valid integer',
    });
  }

  if (pageSizeNum < 1 || pageSizeNum > 100) {
    return res.status(400).json({
      success: false,
      error: 'Page size must be between 1 and 100',
    });
  }

  const filters = {
    from,
    to,
    currency: currency?.trim().toUpperCase(),
    expenseMode: expenseMode || 'approvedOnly',
    includePurchases: includePurchases === undefined ? true : includePurchases === 'true',
    includePayments: includePayments === undefined ? true : includePayments === 'true',
    search: search?.trim(),
    page: pageNum,
    pageSize: pageSizeNum,
    sort: sort || 'desc',
  };

  const result = await statementsService.getStatements(filters);

  // TEMP LOG: Debug result
  console.log('[Statements] result summary', {
    itemCount: result.items.length,
    totalItems: result.pagination.totalItems,
    page: result.pagination.page,
    totals: result.totals,
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});
