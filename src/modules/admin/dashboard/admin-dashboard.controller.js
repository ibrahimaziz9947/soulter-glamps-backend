/**
 * Admin Dashboard Controller
 * Handles HTTP requests for admin dashboard KPI metrics
 */

import * as adminDashboardService from '../../../modules/admin/dashboard/admin-dashboard.service.js';
import { asyncHandler, AppError } from '../../../utils/errors.js';

/**
 * Parse and validate date string
 * Treats date-only strings (YYYY-MM-DD) as:
 * - from: start of day (00:00:00.000)
 * - to: end of day (23:59:59.999)
 * Also accepts ISO datetime strings
 * 
 * @param {string} dateString - Date string to parse
 * @param {boolean} isEndDate - Whether this is an end date (use end of day)
 * @returns {Date} Parsed date object
 * @throws {AppError} If date format is invalid
 */
const parseAndValidateDate = (dateString, isEndDate = false) => {
  if (!dateString) return null;

  // Check if it's a date-only string (YYYY-MM-DD)
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  const isDateOnly = dateOnlyRegex.test(dateString);

  let date;
  if (isDateOnly) {
    // Date-only: treat as start/end of day
    if (isEndDate) {
      // End of day: 23:59:59.999
      date = new Date(`${dateString}T23:59:59.999Z`);
    } else {
      // Start of day: 00:00:00.000
      date = new Date(`${dateString}T00:00:00.000Z`);
    }
  } else {
    // Assume ISO datetime string
    date = new Date(dateString);
  }

  // Validate date
  if (isNaN(date.getTime())) {
    throw new AppError(400, `Invalid date format: ${dateString}. Use YYYY-MM-DD or ISO datetime.`);
  }

  return date;
};

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
  let { from, to } = req.query;

  console.log('[ADMIN DASHBOARD CONTROLLER] Query params:', { from, to });

  // Normalize empty strings to undefined
  if (from === '') from = undefined;
  if (to === '') to = undefined;

  // Default to last 30 days if not provided
  let fromDate;
  let toDate;

  if (!from && !to) {
    // Default: last 30 days
    toDate = new Date(); // Now (end of current day)
    toDate.setHours(23, 59, 59, 999);
    
    fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30); // 30 days ago
    fromDate.setHours(0, 0, 0, 0);
    
    console.log('[ADMIN DASHBOARD CONTROLLER] Using default 30-day range:', { fromDate, toDate });
  } else {
    // Parse provided dates
    fromDate = from ? parseAndValidateDate(from, false) : null;
    toDate = to ? parseAndValidateDate(to, true) : null;
  }

  // Validate date range
  if (fromDate && toDate && fromDate > toDate) {
    throw new AppError(400, 'from date must be before or equal to to date');
  }

  // Call service to get KPI metrics
  const filters = {
    from: fromDate,
    to: toDate,
  };

  const summary = await adminDashboardService.getDashboardSummary(filters);

  console.log('[ADMIN DASHBOARD CONTROLLER] Summary:', summary);

  return res.status(200).json({
    success: true,
    data: summary,
  });
});
