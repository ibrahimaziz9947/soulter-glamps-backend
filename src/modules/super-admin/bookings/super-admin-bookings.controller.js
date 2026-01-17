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

  // Parse date range (defaults to last 30 days)
  // NOTE: Filtering by createdAt (booking creation date), not checkInDate
  const dateRange = parseDateRange(from, to, 30);

  // Parse pagination with skip/take
  const pagination = getPagination(page, limit, 20);

  // Build where clause - filter by booking creation date
  const where = {
    createdAt: {
      gte: dateRange.from,
      lte: dateRange.to,
    },
  };

  // Add status filter if provided
  if (status) {
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
