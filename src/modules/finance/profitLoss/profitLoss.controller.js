import * as profitLossService from './profitLoss.service.js';
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
  const { from, to, currency, includeBreakdown } = req.query;

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

  const filters = {
    from,
    to,
    currency: currency?.trim().toUpperCase(),
    includeBreakdown: includeBreakdown === undefined ? true : includeBreakdown === 'true',
  };

  const profitAndLoss = await profitLossService.computeProfitAndLoss(filters);

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
  const { from, to, currency } = req.query;

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

  const filters = {
    from,
    to,
    currency: currency?.trim().toUpperCase(),
    includeBreakdown: false, // Summary endpoint never includes breakdown
  };

  const profitAndLoss = await profitLossService.computeProfitAndLoss(filters);

  // Return only filters and summary (no breakdown)
  return res.status(200).json({
    success: true,
    data: {
      filters: profitAndLoss.filters,
      summary: profitAndLoss.summary,
    },
  });
});
