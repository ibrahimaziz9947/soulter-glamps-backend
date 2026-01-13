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
 * List purchase records with filters and pagination
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Paginated purchase list with metadata and summary
 */
export const listPurchases = async (filters = {}) => {
  const { 
    page, 
    limit, 
    q, 
    status, 
    currency,
    vendorName,
    dateFrom, 
    dateTo,
  } = filters;

  // Build pagination
  const pagination = getPagination(page, limit);

  // Build where clause
  const where = {
    deletedAt: null, // Always exclude soft-deleted
  };

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Filter by currency
  if (currency) {
    where.currency = currency;
  }

  // Filter by vendorName
  if (vendorName) {
    where.vendorName = { contains: vendorName, mode: 'insensitive' };
  }

  // Filter by date range (purchaseDate)
  if (dateFrom || dateTo) {
    where.purchaseDate = {};
    if (dateFrom) {
      where.purchaseDate.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.purchaseDate.lte = new Date(dateTo);
    }
  }

  // Search by vendorName, reference, or notes
  if (q && q.trim()) {
    where.OR = [
      { vendorName: { contains: q, mode: 'insensitive' } },
      { reference: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  // Execute queries in parallel
  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      include: {
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
        { purchaseDate: 'desc' },
        { createdAt: 'desc' },
      ],
    }),
    prisma.purchase.count({ where }),
  ]);

  // Calculate total amount
  const aggregation = await prisma.purchase.aggregate({
    where,
    _sum: {
      amount: true,
    },
  });

  const totalAmount = aggregation._sum.amount || 0;

  // Build pagination metadata
  const paginationMeta = getPaginationMeta(total, pagination.page, pagination.limit);

  return {
    items: purchases,
    page: paginationMeta.page,
    limit: paginationMeta.limit,
    total: paginationMeta.total,
    summary: {
      totalAmount,
      count: total,
    },
  };
};

/**
 * Get a single purchase record by ID
 * @param {string} id - Purchase ID
 * @returns {Promise<object>} Purchase with creator and updater information
 */
export const getPurchaseById = async (id) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid purchase ID format');
  }

  const purchase = await prisma.purchase.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
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

  if (!purchase) {
    throw new NotFoundError('Purchase');
  }

  return purchase;
};

/**
 * Create a new purchase record
 * @param {object} payload - Purchase data
 * @param {object} actor - User creating the purchase (expects { userId })
 * @returns {Promise<object>} Created purchase with relations
 */
export const createPurchase = async (payload, actor) => {
  // Validate actor
  if (!actor || !actor.userId) {
    throw new ValidationError('Actor with userId is required');
  }

  // Validate required fields
  if (amount === undefined || amount === null) {
    throw new ValidationError('Amount is required');
  }

  if (typeof payload.amount !== 'number' || payload.amount < 0) {
    throw new ValidationError('Amount must be a non-negative number');
  }

  if (!payload.currency || payload.currency.trim().length === 0) {
    throw new ValidationError('Currency is required');
  }

  if (!payload.purchaseDate) {
    throw new ValidationError('Purchase date is required');
  }

  if (!payload.vendorName || payload.vendorName.trim().length === 0) {
    throw new ValidationError('Vendor name is required');
  }

  // Validate status if provided
  if (payload.status) {
    const validStatuses = ['DRAFT', 'CONFIRMED', 'CANCELLED'];
    if (!validStatuses.includes(payload.status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Create purchase record
  const purchase = await prisma.purchase.create({
    data: {
      amount: payload.amount,
      currency: payload.currency.trim().toUpperCase(),
      purchaseDate: new Date(payload.purchaseDate),
      vendorName: payload.vendorName.trim(),
      status: payload.status || 'DRAFT',
      reference: payload.reference?.trim() || null,
      notes: payload.notes?.trim() || null,
      createdById: actor.userId,
    },
    include: {
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

  return purchase;
};

/**
 * Update a purchase record
 * @param {string} id - Purchase ID
 * @param {object} payload - Updated purchase data (partial)
 * @param {object} actor - User updating the purchase (expects { userId })
 * @returns {Promise<object>} Updated purchase
 */
export const updatePurchase = async (id, payload, actor) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid purchase ID format');
  }

  // Validate actor
  if (!actor || !actor.userId) {
    throw new ValidationError('Actor with userId is required');
  }

  // Check if purchase exists and is not deleted
  const existingPurchase = await prisma.purchase.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingPurchase) {
    throw new NotFoundError('Purchase');
  }

  // Build update data
  const updateData = {
    updatedById: actor.userId,
  };

  // Validate and update amount
  if (payload.amount !== undefined) {
    if (typeof payload.amount !== 'number' || payload.amount < 0) {
      throw new ValidationError('Amount must be a non-negative number');
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

  // Update purchaseDate
  if (payload.purchaseDate !== undefined) {
    updateData.purchaseDate = new Date(payload.purchaseDate);
  }

  // Update vendorName
  if (payload.vendorName !== undefined) {
    if (!payload.vendorName || payload.vendorName.trim().length === 0) {
      throw new ValidationError('Vendor name cannot be empty');
    }
    updateData.vendorName = payload.vendorName.trim();
  }

  // Update status
  if (payload.status !== undefined) {
    const validStatuses = ['DRAFT', 'CONFIRMED', 'CANCELLED'];
    if (!validStatuses.includes(payload.status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    updateData.status = payload.status;
  }

  // Update reference
  if (payload.reference !== undefined) {
    updateData.reference = payload.reference?.trim() || null;
  }

  // Update notes
  if (payload.notes !== undefined) {
    updateData.notes = payload.notes?.trim() || null;
  }

  // Update purchase
  const updatedPurchase = await prisma.purchase.update({
    where: { id },
    data: updateData,
    include: {
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

  return updatedPurchase;
};

/**
 * Soft delete a purchase record
 * @param {string} id - Purchase ID
 * @param {object} actor - User deleting the purchase (expects { userId })
 * @returns {Promise<boolean>} Success boolean
 */
export const softDeletePurchase = async (id, actor) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid purchase ID format');
  }

  // Validate actor
  if (!actor || !actor.userId) {
    throw new ValidationError('Actor with userId is required');
  }

  // Check if purchase exists and is not already deleted
  const existingPurchase = await prisma.purchase.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingPurchase) {
    throw new NotFoundError('Purchase');
  }

  // Soft delete by setting deletedAt timestamp
  await prisma.purchase.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedById: actor.userId,
    },
  });

  return true;
};

/**
 * Restore a soft-deleted purchase record
 * @param {string} id - Purchase ID
 * @param {object} actor - User restoring the purchase (expects { userId })
 * @returns {Promise<object>} Restored purchase
 */
export const restorePurchase = async (id, actor) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid purchase ID format');
  }

  // Validate actor
  if (!actor || !actor.userId) {
    throw new ValidationError('Actor with userId is required');
  }

  // Check if purchase exists and is deleted
  const existingPurchase = await prisma.purchase.findFirst({
    where: {
      id,
      deletedAt: { not: null },
    },
  });

  if (!existingPurchase) {
    throw new NotFoundError('Deleted purchase not found');
  }

  // Restore by clearing deletedAt
  const restoredPurchase = await prisma.purchase.update({
    where: { id },
    data: {
      deletedAt: null,
      updatedById: actor.userId,
    },
    include: {
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

  return restoredPurchase;
};

/**
 * Get purchase summary with aggregations and groupings
 * @param {object} filters - Filter options (same as listPurchases but excluding pagination)
 * @returns {Promise<object>} Summary with totals grouped by status and currency
 */
export const getPurchasesSummary = async (filters = {}) => {
  const { status, currency, vendorName, dateFrom, dateTo } = filters;

  // Build where clause (similar to listPurchases but excluding pagination/search)
  const where = {
    deletedAt: null, // Always exclude soft-deleted for summaries
  };

  if (status) {
    where.status = status;
  }

  if (currency) {
    where.currency = currency;
  }

  if (vendorName) {
    where.vendorName = { contains: vendorName, mode: 'insensitive' };
  }

  if (dateFrom || dateTo) {
    where.purchaseDate = {};
    if (dateFrom) {
      where.purchaseDate.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.purchaseDate.lte = new Date(dateTo);
    }
  }

  // Get total count and amount
  const [totalCount, aggregation] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const totalAmountCents = aggregation._sum.amount || 0;

  // Group by status
  const groupByStatus = await prisma.purchase.groupBy({
    by: ['status'],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalsByStatus = groupByStatus.reduce((acc, item) => {
    acc[item.status] = {
      count: item._count.id,
      totalAmount: item._sum.amount || 0,
    };
    return acc;
  }, {});

  // Group by currency
  const groupByCurrency = await prisma.purchase.groupBy({
    by: ['currency'],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalsByCurrency = groupByCurrency.reduce((acc, item) => {
    acc[item.currency] = {
      count: item._count.id,
      totalAmount: item._sum.amount || 0,
    };
    return acc;
  }, {});

  return {
    totalCount,
    totalAmountCents,
    totalsByStatus,
    totalsByCurrency,
  };
};
