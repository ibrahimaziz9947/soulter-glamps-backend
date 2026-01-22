import prisma from '../../../config/prisma.js';
import { NotFoundError, ValidationError } from '../../../utils/errors.js';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.js';

/**
 * Validate UUID format
 */
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * List income records with filters and pagination
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Paginated income list with metadata and summary
 */
export const listIncome = async (filters = {}) => {
  const { 
    page, 
    limit, 
    q, 
    status, 
    source, 
    bookingId, 
    dateFrom, 
    dateTo, 
    includeDeleted = false 
  } = filters;

  // Build pagination
  const pagination = getPagination(page, limit);

  // Build where clause
  const where = {};

  // Soft delete filter
  if (!includeDeleted) {
    where.deletedAt = null;
  }

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Filter by source
  if (source) {
    where.source = source;
  }

  // Filter by bookingId
  if (bookingId) {
    if (!isValidUUID(bookingId)) {
      throw new ValidationError('Invalid booking ID format');
    }
    where.bookingId = bookingId;
  }

  // Filter by date range
  if (dateFrom || dateTo) {
    where.dateReceived = {};
    if (dateFrom) {
      where.dateReceived.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.dateReceived.lte = new Date(dateTo);
    }
  }

  // Search by reference or notes
  if (q && q.trim()) {
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  // Execute queries in parallel
  const [incomes, total] = await Promise.all([
    prisma.income.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      include: {
        booking: {
          select: {
            id: true,
            checkInDate: true,
            checkOutDate: true,
            totalAmount: true,
            status: true,
            customerName: true,
            glampName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        { dateReceived: 'desc' },
        { createdAt: 'desc' },
      ],
    }),
    prisma.income.count({ where }),
  ]);

  // Calculate total amount
  const aggregation = await prisma.income.aggregate({
    where,
    _sum: {
      amount: true,
    },
  });

  const totalAmount = aggregation._sum.amount || 0;

  // Build pagination metadata
  const paginationMeta = getPaginationMeta(total, pagination.page, pagination.limit);

  return {
    data: incomes,
    pagination: paginationMeta,
    summary: {
      total: Math.round(totalAmount / 100), // Whole PKR
      totalAmount, // DEPRECATED: Keep for legacy (raw cents value)
      count: total,
    },
  };
};

/**
 * Get a single income record by ID
 * @param {string} id - Income ID
 * @returns {Promise<object>} Income with booking and creator information
 */
export const getIncomeById = async (id) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid income ID format');
  }

  const income = await prisma.income.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      booking: {
        select: {
          id: true,
          checkInDate: true,
          checkOutDate: true,
          totalAmount: true,
          status: true,
          customerName: true,
          glampName: true,
          customerId: true,
          agentId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!income) {
    throw new NotFoundError('Income');
  }

  return income;
};

/**
 * Create a new income record
 * @param {object} payload - Income data
 * @param {object} actor - User creating the income (expects { userId })
 * @returns {Promise<object>} Created income with relations
 */
export const createIncome = async (payload, actor) => {
  // Validate actor
  if (!actor || !actor.userId) {
    throw new ValidationError('Actor with userId is required');
  }

  // Validate required fields
  if (!payload.amount || typeof payload.amount !== 'number' || payload.amount <= 0) {
    throw new ValidationError('Amount must be a positive number');
  }

  if (!payload.currency || payload.currency.trim().length === 0) {
    throw new ValidationError('Currency is required');
  }

  if (!payload.source) {
    throw new ValidationError('Source is required');
  }

  // Validate source is a valid enum value
  const validSources = ['BOOKING', 'MANUAL', 'OTHER'];
  if (!validSources.includes(payload.source)) {
    throw new ValidationError(`Source must be one of: ${validSources.join(', ')}`);
  }

  // If source is BOOKING, bookingId is required
  if (payload.source === 'BOOKING' && !payload.bookingId) {
    throw new ValidationError('Booking ID is required when source is BOOKING');
  }

  // Validate bookingId if provided
  if (payload.bookingId) {
    if (!isValidUUID(payload.bookingId)) {
      throw new ValidationError('Invalid booking ID format');
    }

    const booking = await prisma.booking.findUnique({
      where: { id: payload.bookingId },
    });

    if (!booking) {
      throw new NotFoundError('Booking');
    }
  }

  // Validate status if provided
  if (payload.status) {
    const validStatuses = ['DRAFT', 'CONFIRMED', 'CANCELLED'];
    if (!validStatuses.includes(payload.status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Create income record
  const income = await prisma.income.create({
    data: {
      amount: payload.amount,
      currency: payload.currency.trim().toUpperCase(),
      dateReceived: payload.dateReceived ? new Date(payload.dateReceived) : new Date(),
      source: payload.source,
      status: payload.status || 'CONFIRMED',
      reference: payload.reference?.trim() || null,
      notes: payload.notes?.trim() || null,
      bookingId: payload.bookingId || null,
      createdById: actor.userId,
    },
    include: {
      booking: {
        select: {
          id: true,
          checkInDate: true,
          checkOutDate: true,
          totalAmount: true,
          status: true,
          customerName: true,
          glampName: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return income;
};

/**
 * Update an income record
 * @param {string} id - Income ID
 * @param {object} payload - Updated income data (partial)
 * @param {object} actor - User updating the income (expects { userId })
 * @returns {Promise<object>} Updated income
 */
export const updateIncome = async (id, payload, actor) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid income ID format');
  }

  // Validate actor
  if (!actor || !actor.userId) {
    throw new ValidationError('Actor with userId is required');
  }

  // Check if income exists and is not deleted
  const existingIncome = await prisma.income.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingIncome) {
    throw new NotFoundError('Income');
  }

  // Build update data
  const updateData = {
    updatedById: actor.userId,
  };

  // Validate and update amount
  if (payload.amount !== undefined) {
    if (typeof payload.amount !== 'number' || payload.amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }
    updateData.amount = payload.amount;
  }

  // Update currency
  if (payload.currency !== undefined) {
    if (!payload.currency || payload.currency.trim().length === 0) {
      throw new ValidationError('Currency cannot be empty');
    }
    updateData.currency = payload.currency.trim().toUpperCase();
  }

  // Update dateReceived
  if (payload.dateReceived !== undefined) {
    updateData.dateReceived = new Date(payload.dateReceived);
  }

  // Update source
  if (payload.source !== undefined) {
    const validSources = ['BOOKING', 'MANUAL', 'OTHER'];
    if (!validSources.includes(payload.source)) {
      throw new ValidationError(`Source must be one of: ${validSources.join(', ')}`);
    }
    updateData.source = payload.source;

    // If changing to BOOKING, ensure bookingId is provided
    if (payload.source === 'BOOKING' && !payload.bookingId && !existingIncome.bookingId) {
      throw new ValidationError('Booking ID is required when source is BOOKING');
    }
  }

  // Update status
  if (payload.status !== undefined) {
    const validStatuses = ['DRAFT', 'CONFIRMED', 'CANCELLED'];
    if (!validStatuses.includes(payload.status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    updateData.status = payload.status;
  }

  // Update bookingId
  if (payload.bookingId !== undefined) {
    if (payload.bookingId === null) {
      // Allow removing booking
      updateData.bookingId = null;
    } else {
      if (!isValidUUID(payload.bookingId)) {
        throw new ValidationError('Invalid booking ID format');
      }

      const booking = await prisma.booking.findUnique({
        where: { id: payload.bookingId },
      });

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      updateData.bookingId = payload.bookingId;
    }
  }

  // Update reference
  if (payload.reference !== undefined) {
    updateData.reference = payload.reference?.trim() || null;
  }

  // Update notes
  if (payload.notes !== undefined) {
    updateData.notes = payload.notes?.trim() || null;
  }

  // Update income
  const updatedIncome = await prisma.income.update({
    where: { id },
    data: updateData,
    include: {
      booking: {
        select: {
          id: true,
          checkInDate: true,
          checkOutDate: true,
          totalAmount: true,
          status: true,
          customerName: true,
          glampName: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return updatedIncome;
};

/**
 * Soft delete an income record
 * @param {string} id - Income ID
 * @param {object} actor - User deleting the income (expects { userId })
 * @returns {Promise<boolean>} Success boolean
 */
export const softDeleteIncome = async (id, actor) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid income ID format');
  }

  // Validate actor
  if (!actor || !actor.userId) {
    throw new ValidationError('Actor with userId is required');
  }

  // Check if income exists and is not already deleted
  const existingIncome = await prisma.income.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingIncome) {
    throw new NotFoundError('Income');
  }

  // Soft delete by setting deletedAt timestamp
  await prisma.income.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedById: actor.userId,
    },
  });

  return true;
};

/**
 * Restore a soft-deleted income record
 * @param {string} id - Income ID
 * @param {object} actor - User restoring the income (expects { userId })
 * @returns {Promise<object>} Restored income
 */
export const restoreIncome = async (id, actor) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid income ID format');
  }

  // Validate actor
  if (!actor || !actor.userId) {
    throw new ValidationError('Actor with userId is required');
  }

  // Check if income exists and is deleted
  const existingIncome = await prisma.income.findFirst({
    where: {
      id,
      deletedAt: { not: null },
    },
  });

  if (!existingIncome) {
    throw new NotFoundError('Deleted income not found');
  }

  // Restore by clearing deletedAt
  const restoredIncome = await prisma.income.update({
    where: { id },
    data: {
      deletedAt: null,
      updatedById: actor.userId,
    },
    include: {
      booking: {
        select: {
          id: true,
          checkInDate: true,
          checkOutDate: true,
          totalAmount: true,
          status: true,
          customerName: true,
          glampName: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return restoredIncome;
};

/**
 * Get income summary with aggregations and groupings
 * @param {object} filters - Filter options (same as listIncome)
 * @returns {Promise<object>} Summary with totals grouped by source and status
 */
export const incomeSummary = async (filters = {}) => {
  const { status, source, bookingId, dateFrom, dateTo } = filters;

  // Build where clause (similar to listIncome but excluding pagination/search)
  const where = {
    deletedAt: null, // Always exclude soft-deleted for summaries
  };

  if (status) {
    where.status = status;
  }

  if (source) {
    where.source = source;
  }

  if (bookingId) {
    if (!isValidUUID(bookingId)) {
      throw new ValidationError('Invalid booking ID format');
    }
    where.bookingId = bookingId;
  }

  if (dateFrom || dateTo) {
    where.dateReceived = {};
    if (dateFrom) {
      where.dateReceived.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.dateReceived.lte = new Date(dateTo);
    }
  }

  // Get total count and amount
  const [totalCount, aggregation] = await Promise.all([
    prisma.income.count({ where }),
    prisma.income.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const totalAmountCents = aggregation._sum.amount || 0;

  // Group by source
  const groupBySource = await prisma.income.groupBy({
    by: ['source'],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });

  const bySource = groupBySource.reduce((acc, item) => {
    const amountCents = item._sum.amount || 0;
    acc[item.source] = {
      count: item._count.id,
      total: Math.round(amountCents / 100), // Whole PKR
      totalAmount: amountCents, // DEPRECATED: Legacy field (cents)
    };
    return acc;
  }, {});

  // Group by status
  const groupByStatus = await prisma.income.groupBy({
    by: ['status'],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });

  const byStatus = groupByStatus.reduce((acc, item) => {
    const amountCents = item._sum.amount || 0;
    acc[item.status] = {
      count: item._count.id,
      total: Math.round(amountCents / 100), // Whole PKR
      totalAmount: amountCents, // DEPRECATED: Legacy field (cents)
    };
    return acc;
  }, {});

  return {
    totalCount,
    total: Math.round(totalAmountCents / 100), // Whole PKR
    totalAmountCents, // DEPRECATED: Legacy field
    bySource,
    byStatus,
  };
};
