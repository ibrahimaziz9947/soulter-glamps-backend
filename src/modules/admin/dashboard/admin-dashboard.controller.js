/**
 * Admin Dashboard Controller
 * Handles HTTP requests for admin dashboard KPI metrics
 */

import * as adminDashboardService from '../../../modules/admin/dashboard/admin-dashboard.service.js';
import { asyncHandler, AppError } from '../../../utils/errors.js';
import { parseDateRange } from '../../../utils/dateRange.js';


/**
 * Get admin dashboard summary KPIs
 * @route GET /api/admin/dashboard/summary
 * @access ADMIN, SUPER_ADMIN
 * 
 * Query params:
 * - from: Start date (YYYY-MM-DD or ISO datetime)
 * - to: End date (YYYY-MM-DD or ISO datetime)
 * 
 * If from/to not provided, defaults to last 30 days
 * 
 * Example:
 * GET /api/admin/dashboard/summary?from=2026-01-01&to=2026-01-31
 * GET /api/admin/dashboard/summary (defaults to last 30 days)
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  console.log('[ADMIN DASHBOARD CONTROLLER] Query params:', { from, to });

  // Parse date range with validation (defaults to last 30 days)
  const dateRange = parseDateRange(from, to, 30);
  
  console.log('[ADMIN DASHBOARD CONTROLLER] Parsed date range:', {
    from: dateRange.fromISO,
    to: dateRange.toISO
  });

  // Call service to get KPI metrics
  const filters = {
    from: dateRange.from,
    to: dateRange.to,
  };

  const summary = await adminDashboardService.getDashboardSummary(filters);

  console.log('[ADMIN DASHBOARD CONTROLLER] Summary:', summary);

  return res.status(200).json({
    success: true,
    data: summary,
  });
});
