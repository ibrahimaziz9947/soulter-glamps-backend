import * as profitLossService from './profitLoss.service.js';
import { asyncHandler } from '../../../utils/errors.js';
import prisma from '../../../config/prisma.js';

/**
 * Validate ISO date format
 */
const isValidDate = (dateString) => {
  if (!dateString) return true; // Optional parameter
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(dateString);
};

/**
 * Get Profit & Loss statement with full breakdown
 * @route GET /api/finance/profit-loss
 * @access ADMIN, SUPER_ADMIN
 * 
 * Query params:
 * - from: Start date (ISO format, e.g., 2026-01-01)
 * - to: End date (ISO format, e.g., 2026-01-31)
 * - currency: Optional currency filter (e.g., USD)
 * - includeBreakdown: Include detailed breakdown (default: true)
 * 
 * Note: All amounts are in CENTS. Soft-deleted records (deletedAt: null) are automatically excluded.
 * 
 * Sample curl:
 * curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-01-31&includeBreakdown=true" \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 * 
 * curl -X GET "http://localhost:5001/api/finance/profit-loss?currency=USD" \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 */
export const getProfitAndLoss = asyncHandler(async (req, res) => {
  const { from, to, currency, includeBreakdown, expenseMode } = req.query;

  // TEMP LOG: Debug query parameters
  console.log('[P&L] query', req.query);

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

  // Validate expenseMode if provided
  if (expenseMode && !['approvedOnly', 'includeSubmitted'].includes(expenseMode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid expenseMode. Must be "approvedOnly" or "includeSubmitted"',
    });
  }

  // ============================================
  // TEMPORARY DEBUG: Prove expense counts
  // ============================================
  console.log('[P&L EXPENSE DEBUG] ========== START ==========');
  console.log('[P&L EXPENSE DEBUG] expenseMode from query:', expenseMode);
  console.log('[P&L EXPENSE DEBUG] expenseMode after default:', expenseMode || 'approvedOnly');

  // Step 1: Count ALL non-deleted expenses
  const totalExpensesAll = await prisma.expense.count({
    where: { deletedAt: null },
  });
  console.log('[P&L EXPENSE DEBUG] totalExpensesAll (deletedAt: null):', totalExpensesAll);

  // Step 2: Fetch 10 latest expenses
  const latestExpenses = await prisma.expense.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      status: true,
      amount: true,
      date: true,
      createdAt: true,
      title: true,
    },
  });
  console.log('[P&L EXPENSE DEBUG] Latest 10 expenses:', JSON.stringify(latestExpenses, null, 2));

  // Step 3: Compute status distribution
  const statusDistribution = latestExpenses.reduce((acc, exp) => {
    acc[exp.status] = (acc[exp.status] || 0) + 1;
    return acc;
  }, {});
  console.log('[P&L EXPENSE DEBUG] Status distribution (from 10 samples):', statusDistribution);

  // Step 4: Log what P&L is filtering for
  const effectiveExpenseMode = expenseMode || 'approvedOnly';
  const expenseStatusFilter = effectiveExpenseMode === 'includeSubmitted' 
    ? ['SUBMITTED', 'APPROVED'] 
    : ['APPROVED'];
  console.log('[P&L EXPENSE DEBUG] P&L will filter for statuses:', expenseStatusFilter);

  // Step 5: Build date range if provided
  const dateRange = {};
  if (from) {
    dateRange.gte = new Date(from);
  }
  if (to) {
    dateRange.lte = new Date(to);
  }

  // Step 6: Build exact where clause used in P&L
  const testExpenseWhere = {
    AND: [
      { deletedAt: null },
      { status: { in: expenseStatusFilter } },
    ],
  };
  if (Object.keys(dateRange).length > 0) {
    testExpenseWhere.AND.push({ date: dateRange });
  }
  console.log('[P&L EXPENSE DEBUG] Exact where clause P&L uses:', JSON.stringify(testExpenseWhere, null, 2));

  // Step 7: Count matched expenses with this where clause
  const matchedExpensesCount = await prisma.expense.count({
    where: testExpenseWhere,
  });
  console.log('[P&L EXPENSE DEBUG] matchedExpensesCount:', matchedExpensesCount);
  console.log('[P&L EXPENSE DEBUG] ========== END ==========');
  // ============================================

  const filters = {
    from,
    to,
    currency: currency?.trim().toUpperCase(),
    includeBreakdown: includeBreakdown === undefined ? true : includeBreakdown === 'true',
    expenseMode: expenseMode || 'approvedOnly',
  };

  const profitAndLoss = await profitLossService.computeProfitAndLoss(filters);

  // TEMP LOG: Debug counts
  console.log('[P&L] counts', {
    incomeCount: profitAndLoss.debugCounts?.income || 0,
    expenseCount: profitAndLoss.debugCounts?.expenses || 0,
    purchaseCount: profitAndLoss.debugCounts?.purchases || 0,
  });

  return res.status(200).json({
    success: true,
    data: profitAndLoss,
  });
});

/**
 * Get Profit & Loss summary (totals only, no breakdown)
 * @route GET /api/finance/profit-loss/summary
 * @access ADMIN, SUPER_ADMIN
 * 
 * Query params:
 * - from: Start date (ISO format, e.g., 2026-01-01)
 * - to: End date (ISO format, e.g., 2026-01-31)
 * - currency: Optional currency filter (e.g., USD)
 * 
 * Note: All amounts are in CENTS. Soft-deleted records (deletedAt: null) are automatically excluded.
 * 
 * Sample curl:
 * curl -X GET "http://localhost:5001/api/finance/profit-loss/summary?from=2026-01-01&to=2026-01-31" \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 * 
 * curl -X GET "http://localhost:5001/api/finance/profit-loss/summary?currency=USD" \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 */
export const getProfitAndLossSummary = asyncHandler(async (req, res) => {
  const { from, to, currency, expenseMode } = req.query;

  // TEMP LOG: Debug query parameters
  console.log('[P&L Summary] query', req.query);

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

  // Validate expenseMode if provided
  if (expenseMode && !['approvedOnly', 'includeSubmitted'].includes(expenseMode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid expenseMode. Must be "approvedOnly" or "includeSubmitted"',
    });
  }

  const filters = {
    from,
    to,
    currency: currency?.trim().toUpperCase(),
    includeBreakdown: false, // Summary endpoint never includes breakdown
    expenseMode: expenseMode || 'approvedOnly',
  };

  const profitAndLoss = await profitLossService.computeProfitAndLoss(filters);

  // TEMP LOG: Debug counts
  console.log('[P&L Summary] counts', {
    incomeCount: profitAndLoss.debugCounts?.income || 0,
    expenseCount: profitAndLoss.debugCounts?.expenses || 0,
    purchaseCount: profitAndLoss.debugCounts?.purchases || 0,
  });

  // Return only filters and summary (no breakdown)
  return res.status(200).json({
    success: true,
    data: {
      filters: profitAndLoss.filters,
      summary: profitAndLoss.summary,
    },
  });
});
