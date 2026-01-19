/**
 * Super Admin Commissions Service
 * Service for managing all commissions with advanced filtering and aggregations
 * 
 * @module super-admin-commissions.service
 */

import prisma from '../../../config/prisma.js';
import { NotFoundError, ValidationError, AppError } from '../../../utils/errors.js';

/**
 * Get all commissions with advanced filtering, pagination, and aggregations
 * @param {Object} filters - Filters to apply
 * @param {Date} filters.from - Start date for date range filter (Date object)
 * @param {Date} filters.to - End date for date range filter (Date object)
 * @param {string} filters.status - Filter by commission status (UNPAID, PAID, or ALL)
 * @param {string} filters.agentId - Filter by agent ID
 * @param {string} filters.bookingId - Filter by booking ID
 * @param {string} filters.search - Search term for agent name/email or commission/booking ID
 * @param {Object} pagination - Pagination options
 * @param {number} pagination.skip - Number of items to skip
 * @param {number} pagination.take - Number of items to take
 * @param {string} orderBy - Sort field and direction (e.g., 'createdAt_desc')
 * @returns {Object} Commissions list and metadata
 */
export const getAllCommissions = async (filters = {}, pagination = {}, orderBy = 'createdAt_desc') => {
  const { from, to, status, agentId, bookingId, search } = filters;
  const { skip = 0, take = 20 } = pagination;

  // Build where clause dynamically
  const where = {};

  // Date range filter: Use createdAt consistently for from/to filtering
  // 'to' is already inclusive (end of day) from parseDateRange utility
  if (from && to) {
    where.createdAt = {
      gte: from,
      lte: to,
    };
  }

  // Add status filter only if provided and not "ALL"
  if (status && status !== 'ALL' && status.trim() !== '') {
    where.status = status;
  }

  // Add agent filter if provided
  if (agentId && agentId.trim() !== '') {
    where.agentId = agentId;
  }

  // Add booking filter if provided
  if (bookingId && bookingId.trim() !== '') {
    where.bookingId = bookingId;
  }

  // Add search filter with OR conditions
  // Search across: commission ID, agent name, agent email, booking ID
  if (search && search.trim()) {
    const searchTerm = search.trim();
    where.OR = [
      // Search by commission ID
      { id: { contains: searchTerm, mode: 'insensitive' } },
      // Search by agent name (via relation)
      { agent: { name: { contains: searchTerm, mode: 'insensitive' } } },
      // Search by agent email (via relation)
      { agent: { email: { contains: searchTerm, mode: 'insensitive' } } },
      // Search by booking ID
      { bookingId: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  // Parse sort parameter (format: field_direction)
  // Default: createdAt desc (newest first)
  const [sortField = 'createdAt', sortDirection = 'desc'] = orderBy.split('_');
  const sortOption = {
    [sortField]: sortDirection.toLowerCase(),
  };

  // Debug logging (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[COMMISSIONS] Query filters:', {
      dateRange: from && to ? { from: from.toISOString(), to: to.toISOString() } : 'not applied',
      whereKeys: Object.keys(where),
      hasSearch: !!search,
      statusFilter: status || 'none',
    });
  }

  // Execute queries in parallel
  const [items, total] = await Promise.all([
    // Fetch commissions with related data
    prisma.commission.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        status: true,
        amount: true,
        bookingId: true,
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: sortOption,
      skip,
      take,
    }),
    // Count total matching records
    prisma.commission.count({ where }),
  ]);

  // Calculate aggregates across ALL filtered records (not just current page)
  // Use the SAME where clause to ensure consistency
  // Note: Commission model in schema has only UNPAID and PAID statuses
  
  // Calculate pending (UNPAID) aggregates
  const pendingWhere = { ...where, status: 'UNPAID' };
  const pendingAgg = await prisma.commission.aggregate({
    where: pendingWhere,
    _count: { id: true },
    _sum: { amount: true },
  });

  // Calculate paid aggregates
  const paidWhere = { ...where, status: 'PAID' };
  const paidAgg = await prisma.commission.aggregate({
    where: paidWhere,
    _count: { id: true },
    _sum: { amount: true },
  });

  // Calculate total across all statuses in the filtered dataset
  const totalAgg = await prisma.commission.aggregate({
    where,
    _sum: { amount: true },
  });

  // Build aggregates object with integer cents values
  const aggregatesData = {
    pendingCount: pendingAgg._count.id || 0,
    pendingAmountCents: pendingAgg._sum.amount || 0,
    paidCount: paidAgg._count.id || 0,
    paidAmountCents: paidAgg._sum.amount || 0,
    totalAmountCents: totalAgg._sum.amount || 0,
  };

  // Map items to include amountCents field
  // DB stores amount in cents, so we just rename the field
  const mappedItems = items.map(item => ({
    ...item,
    amountCents: item.amount, // DB already stores in cents
  }));

  // Debug logging (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[COMMISSIONS] Query results:', {
      total,
      pendingCount: aggregatesData.pendingCount,
      paidCount: aggregatesData.paidCount,
      itemsReturned: items.length,
    });
    console.log('[COMMISSIONS] Aggregates (cents):', {
      pendingAmountCents: aggregatesData.pendingAmountCents,
      paidAmountCents: aggregatesData.paidAmountCents,
      totalAmountCents: aggregatesData.totalAmountCents,
    });
    if (mappedItems.length > 0) {
      console.log('[COMMISSIONS] First item:', {
        id: mappedItems[0].id,
        status: mappedItems[0].status,
        amount: mappedItems[0].amount,
        amountCents: mappedItems[0].amountCents,
      });
    }
  }

  return {
    items: mappedItems,
    total,
    aggregates: aggregatesData,
  };
};

/**
 * Get commission by ID with full details
 * @param {string} id - Commission ID
 * @returns {Object} Commission details with related data
 */
export const getCommissionById = async (id) => {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('Commission ID is required');
  }

  const commission = await prisma.commission.findUnique({
    where: { id },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      booking: {
        select: {
          id: true,
          customerName: true,
          checkInDate: true,
          checkOutDate: true,
          totalAmount: true,
          status: true,
          glamp: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!commission) {
    throw new NotFoundError('Commission');
  }

  return commission;
};

/**
 * Mark commission as paid
 * 
 * Business Rules:
 * - UNPAID -> PAID: Allowed, commission is marked as paid
 * - PAID -> PAID: Idempotent, returns existing record (200 OK)
 * - Note: If payment metadata (paidAt, note, etc.) is provided, it's logged but not stored
 *         in the database unless schema has dedicated fields. Add fields if needed.
 * 
 * @param {string} id - Commission ID
 * @param {Object} data - Update data
 * @param {string} data.paidAt - ISO datetime when payment was made
 * @param {string} data.note - Optional payment note
 * @param {string} data.paymentMethod - Payment method used (e.g., TRANSFER, CHECK, CASH)
 * @param {string} data.reference - Payment reference/transaction ID
 * @returns {Object} Updated commission with full details
 */
export const markCommissionAsPaid = async (id, data = {}) => {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('Commission ID is required');
  }

  // Verify commission exists
  const commission = await prisma.commission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      amount: true,
    },
  });

  if (!commission) {
    throw new NotFoundError('Commission not found');
  }

  // Idempotent operation: If already PAID, return existing record
  // This allows retrying the operation safely without errors
  if (commission.status === 'PAID') {
    // Return full commission details (already paid)
    return getCommissionById(id);
  }

  // Validate status transition: Only UNPAID -> PAID is allowed
  // Commission schema only has UNPAID and PAID statuses
  if (commission.status !== 'UNPAID') {
    throw new AppError(
      `Cannot mark commission as paid. Current status is ${commission.status}. Only UNPAID commissions can be marked as paid.`,
      400
    );
  }

  // Update commission status to PAID
  // Note: Payment metadata (paidAt, note, paymentMethod, reference) is not stored
  // in the current schema. If you need these fields, add them to the Commission model:
  // paidAt DateTime?, paymentMethod String?, paymentNote String?, reference String?
  const updatedCommission = await prisma.commission.update({
    where: { id },
    data: {
      status: 'PAID',
      // Future: Store payment metadata if schema fields exist
      // paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
      // paymentMethod: data.paymentMethod,
      // paymentNote: data.note,
      // reference: data.reference,
    },
  });

  // Log payment metadata for audit purposes (optional)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[COMMISSION PAID] ID:', id);
    console.log('[COMMISSION PAID] Amount:', commission.amount);
    if (data.paidAt) console.log('[COMMISSION PAID] Paid At:', data.paidAt);
    if (data.paymentMethod) console.log('[COMMISSION PAID] Method:', data.paymentMethod);
    if (data.reference) console.log('[COMMISSION PAID] Reference:', data.reference);
    if (data.note) console.log('[COMMISSION PAID] Note:', data.note);
  }

  // Return full commission details with relations
  return getCommissionById(id);
};

/**
 * Mark commission as unpaid (revert from PAID status)
 * 
 * Business Rules:
 * - PAID -> UNPAID: Allowed (reversal operation)
 * - UNPAID -> UNPAID: Error, already unpaid
 * - This allows correcting mistaken payment markings
 * 
 * @param {string} id - Commission ID
 * @param {Object} data - Optional data with reason/note
 * @param {string} data.reason - Reason for reverting to unpaid
 * @returns {Object} Updated commission with full details
 */
export const markCommissionAsUnpaid = async (id, data = {}) => {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('Commission ID is required');
  }

  // Verify commission exists
  const commission = await prisma.commission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      amount: true,
    },
  });

  if (!commission) {
    throw new NotFoundError('Commission not found');
  }

  // Validate status transition: Only PAID -> UNPAID is allowed
  if (commission.status !== 'PAID') {
    throw new AppError(
      `Cannot mark commission as unpaid. Current status is ${commission.status}. Only PAID commissions can be reverted to UNPAID.`,
      400
    );
  }

  // Update commission status back to UNPAID
  const updatedCommission = await prisma.commission.update({
    where: { id },
    data: {
      status: 'UNPAID',
      // Future: Clear payment metadata if schema fields exist
      // paidAt: null,
      // paymentMethod: null,
      // paymentNote: data.reason,
      // reference: null,
    },
  });

  // Log reversal for audit purposes (optional)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[COMMISSION UNPAID] ID:', id);
    console.log('[COMMISSION UNPAID] Amount:', commission.amount);
    if (data.reason) console.log('[COMMISSION UNPAID] Reason:', data.reason);
  }

  // Return full commission details with relations
  return getCommissionById(id);
};
