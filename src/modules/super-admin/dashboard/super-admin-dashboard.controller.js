/**
 * Super Admin Dashboard Controller
 * Handles HTTP requests for super admin dashboard metrics
 */

import * as superAdminDashboardService from './super-admin-dashboard.service.js';
import { asyncHandler, AppError } from '../../../utils/errors.js';
import { parseDateRange, formatDateRange } from '../../../utils/dateRange.js';

/**
 * Get super admin dashboard summary
 * @route GET /api/super-admin/dashboard/summary
 * @access SUPER_ADMIN
 * 
 * Query params:
 * - from: Start date (YYYY-MM-DD or ISO datetime)
 * - to: End date (YYYY-MM-DD or ISO datetime)
 * 
 * If from/to not provided, defaults to last 30 days
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  console.log('[SUPER ADMIN DASHBOARD CONTROLLER] Query params:', { from, to });

  // Parse date range with validation (defaults to last 30 days)
  const dateRange = parseDateRange(from, to, 30);
  
  console.log('[SUPER ADMIN DASHBOARD CONTROLLER] Parsed date range:', {
    from: dateRange.fromISO,
    to: dateRange.toISO
  });

  // Call service to get metrics
  const filters = {
    from: dateRange.from,
    to: dateRange.to,
  };

  const summary = await superAdminDashboardService.getDashboardSummary(filters);

  console.log('[SUPER ADMIN DASHBOARD CONTROLLER] Summary retrieved successfully');

  return res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * Ping check endpoint
 * @route GET /api/super-admin/dashboard/ping
 * @access SUPER_ADMIN
 * 
 * Simple health check endpoint for database connectivity
 */
export const ping = asyncHandler(async (req, res) => {
  console.log('[SUPER ADMIN DASHBOARD CONTROLLER] Ping check requested');

  const health = await superAdminDashboardService.pingCheck();

  const statusCode = health.ok ? 200 : 503;

  return res.status(statusCode).json({
    success: health.ok,
    data: health,
  });
});
