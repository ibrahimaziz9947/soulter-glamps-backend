/**
 * Super Admin Bookings Controller
 * Handles all booking management endpoints for super admins
 * 
 * @module super-admin-bookings.controller
 */

import prisma from '../../../config/prisma.js';
import { asyncHandler } from '../../../utils/errors.js';
import { parseDateRange } from '../../../utils/dateRange.js';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.js';

/**
 * Get all bookings with filtering, pagination, and search
 * @route GET /api/super-admin/bookings
 * @access SUPER_ADMIN
 */
export const getAllBookings = asyncHandler(async (req, res) => {
  const { 
    from, 
    to, 
    page, 
    limit, 
    status, 
    search, 
    sort = 'createdAt_desc' 
  } = req.query;

  // Debug logging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SUPER ADMIN BOOKINGS] Raw query params:', { from, to, page, limit, status, search, sort });
  }

  // Parse date range (defaults to last 30 days)
  // NOTE: Filtering by createdAt (booking creation date), not checkInDate
  // This matches the dashboard logic for consistency
  const dateRange = parseDateRange(from, to, 30);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[SUPER ADMIN BOOKINGS] Parsed date range:', {
      from: dateRange.fromISO,
      to: dateRange.toISO,
      fromObj: dateRange.from,
      toObj: dateRange.to
    });
  }

  // Parse pagination with skip/take
  const pagination = getPagination(page, limit, 20);

  // Build where clause - filter by booking creation date
  const where = {
    createdAt: {
      gte: dateRange.from,
      lte: dateRange.to,
    },
  };

  // Add status filter if provided (ignore 'ALL' or empty string)
  if (status && status !== 'ALL' && status.trim() !== '') {
    where.status = status;
  }

  // Add search filter with OR conditions
  // Search across: booking ID, customer name (snapshot), customer email
  if (search && search.trim()) {
    const searchTerm = search.trim();
    where.OR = [
      { id: { contains: searchTerm, mode: 'insensitive' } },
      { customerName: { contains: searchTerm, mode: 'insensitive' } },
      { customer: { email: { contains: searchTerm, mode: 'insensitive' } } },
    ];
  }

  // Parse sort parameter (format: field_direction)
  // Default: createdAt desc (newest first)
  const [sortField = 'createdAt', sortDirection = 'desc'] = sort.split('_');
  const orderBy = {
    [sortField]: sortDirection.toLowerCase(),
  };

  // Debug: Log where clause before query
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SUPER ADMIN BOOKINGS] Where clause:', JSON.stringify(where, null, 2));
    console.log('[SUPER ADMIN BOOKINGS] OrderBy:', orderBy);
    console.log('[SUPER ADMIN BOOKINGS] Pagination:', { page: pagination.page, limit: pagination.limit, skip: (pagination.page - 1) * pagination.limit });
  }

  // Execute queries in parallel: findMany + count with same filters
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        status: true,
        customerName: true, // Snapshot field
        glampName: true, // Snapshot field
        totalAmount: true, // Amount in cents (integer)
        agentId: true, // Include if agent exists
        checkInDate: true,
        checkOutDate: true,
        guests: true,
      },
      orderBy,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.booking.count({ where }),
  ]);

  // Debug: Log query results
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SUPER ADMIN BOOKINGS] Query results:', { itemsFound: items.length, totalCount: total });
    if (items.length > 0) {
      console.log('[SUPER ADMIN BOOKINGS] First item:', items[0]);
    }
  }

  // Compute aggregates for the entire filtered dataset (not just current page)
  // This matches the dashboard approach
  const [statusCounts, revenueAgg] = await Promise.all([
    // Count by status
    prisma.booking.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
    // Sum revenue from CONFIRMED and COMPLETED bookings
    prisma.booking.aggregate({
      where: {
        ...where,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  // Build status counts object
  const confirmedCount = statusCounts.find(s => s.status === 'CONFIRMED')?._count?.id || 0;
  const pendingCount = statusCounts.find(s => s.status === 'PENDING')?._count?.id || 0;
  const cancelledCount = statusCounts.find(s => s.status === 'CANCELLED')?._count?.id || 0;
  const completedCount = statusCounts.find(s => s.status === 'COMPLETED')?._count?.id || 0;
  const revenueCents = revenueAgg._sum.totalAmount || 0;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[SUPER ADMIN BOOKINGS] Aggregates:', {
      totalBookings: total,
      confirmedCount,
      pendingCount,
      cancelledCount,
      completedCount,
      revenueCents
    });
  }

  // Format items for light list response
  // All money values are in cents (integer)
  const formattedItems = items.map(booking => ({
    id: booking.id,
    createdAt: booking.createdAt,
    status: booking.status,
    customerName: booking.customerName,
    glampName: booking.glampName,
    totalAmountCents: booking.totalAmount, // Explicitly named as cents
    agentId: booking.agentId, // null if no agent
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    guests: booking.guests,
  }));

  // Build response
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: {
      items: formattedItems,
      meta: {
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages: meta.totalPages,
      },
      range: {
        from: dateRange.fromISO,
        to: dateRange.toISO,
      },
      aggregates: {
        totalBookings: total,
        confirmedCount,
        pendingCount,
        cancelledCount,
        completedCount,
        revenueCents,
      },
    },
  });
});

/**
 * Get single booking by ID with full details
 * @route GET /api/super-admin/bookings/:id
 * @access SUPER_ADMIN
 */
export const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
        },
      },
      glamp: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          pricePerNight: true, // Cents
          maxGuests: true,
          status: true,
        },
      },
      commission: {
        select: {
          id: true,
          amount: true, // Cents
          status: true,
          createdAt: true,
        },
      },
      incomes: {
        select: {
          id: true,
          amount: true, // Cents
          source: true,
          status: true,
          notes: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      error: 'Booking not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: booking,
  });
});
