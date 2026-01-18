/**
 * Super Admin Commissions Controller
 * Handles all commission management endpoints for super admins
 * 
 * @module super-admin-commissions.controller
 */

import prisma from '../../../config/prisma.js';
import { asyncHandler, ValidationError } from '../../../utils/errors.js';
import { parseDateRange } from '../../../utils/dateRange.js';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.js';
import * as commissionsService from './super-admin-commissions.service.js';

/**
 * Get all commissions with filtering, pagination, search, and aggregations
 * @route GET /api/super-admin/commissions
 * @access SUPER_ADMIN
 * 
 * Query params:
 * - from: Start date (YYYY-MM-DD or ISO datetime, optional; default: 30 days ago)
 * - to: End date (YYYY-MM-DD or ISO datetime, optional; default: now)
 * - status: Commission status filter (PENDING/UNPAID/PAID/etc; if "ALL" or empty => no filter)
 * - agentId: Filter by agent ID (optional)
 * - bookingId: Filter by booking ID (optional)
 * - search: Search term for agent name/email or commission/booking ID (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sort: Sort field and direction (default: createdAt_desc)
 */
export const getAllCommissions = asyncHandler(async (req, res) => {
  const { 
    from, 
    to, 
    status, 
    agentId, 
    bookingId, 
    search, 
    page, 
    limit, 
    sort = 'createdAt_desc' 
  } = req.query;

  // Parse date range (defaults to last 30 days)
  const dateRange = parseDateRange(from, to, 30);

  // Parse pagination
  const pagination = getPagination(page, limit, 20);

  // Fetch commissions with filters and aggregations
  const { items, total, aggregates } = await commissionsService.getAllCommissions(
    {
      from: dateRange.from,
      to: dateRange.to,
      status,
      agentId,
      bookingId,
      search,
    },
    {
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    },
    sort
  );

  // Calculate pagination metadata
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  // Format response
  return res.status(200).json({
    success: true,
    data: {
      items,
      meta,
      range: {
        from: dateRange.fromISO,
        to: dateRange.toISO,
      },
      aggregates,
    },
  });
});

/**
 * Get commission by ID with full details
 * @route GET /api/super-admin/commissions/:id
 * @access SUPER_ADMIN
 */
export const getCommissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    throw new ValidationError('Commission ID is required');
  }

  const commission = await commissionsService.getCommissionById(id);

  return res.status(200).json({
    success: true,
    data: commission,
  });
});

/**
 * Mark commission as paid
 * @route POST /api/super-admin/commissions/:id/mark-paid
 * @access SUPER_ADMIN
 * 
 * Body:
 * {
 *   paidAt?: string (ISO datetime),
 *   note?: string,
 *   paymentMethod?: string (TRANSFER, CHECK, CASH, etc.),
 *   reference?: string (transaction ID or reference number)
 * }
 */
export const markCommissionAsPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paidAt, note, paymentMethod, reference } = req.body;

  if (!id || typeof id !== 'string') {
    throw new ValidationError('Commission ID is required');
  }

  // Validate paidAt if provided
  if (paidAt) {
    const date = new Date(paidAt);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid paidAt date format. Use ISO datetime (e.g., 2026-01-15T10:30:00Z)');
    }
  }

  const commission = await commissionsService.markCommissionAsPaid(id, {
    paidAt,
    note,
    paymentMethod,
    reference,
  });

  return res.status(200).json({
    success: true,
    message: 'Commission marked as paid successfully',
    data: commission,
  });
});

/**
 * Mark commission as unpaid (revert from PAID status)
 * @route POST /api/super-admin/commissions/:id/mark-unpaid
 * @access SUPER_ADMIN
 * 
 * Body:
 * {
 *   reason?: string (optional reason for reverting)
 * }
 */
export const markCommissionAsUnpaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!id || typeof id !== 'string') {
    throw new ValidationError('Commission ID is required');
  }

  const commission = await commissionsService.markCommissionAsUnpaid(id, {
    reason,
  });

  return res.status(200).json({
    success: true,
    message: 'Commission marked as unpaid successfully',
    data: commission,
  });
});
