import prisma from '../../../config/prisma.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';

/**
 * Helper: Validate UUID format
 */
function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Helper: Normalize date input (same as purchases)
 */
function normalizeDate(dateInput) {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // Handle YYYY-MM-DD format
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return new Date(`${dateInput}T00:00:00.000Z`);
  }
  
  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError('Invalid date format');
  }
  
  return parsed;
}

/**
 * List payables (purchases with outstanding amounts)
 * @param {object} params - Filter and pagination parameters
 * @returns {Promise<object>} Paginated payables list with metadata
 */
export const listPayables = async (params = {}) => {
  try {
    const {
      q,
      status,
      currency,
      from,
      to,
      dueFrom,
      dueTo,
      page = 1,
      pageSize = 20,
      sortBy = 'purchaseDate',
      sortOrder = 'desc',
    } = params;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
    const skip = (pageNum - 1) * limit;

    // Build where clause
    const where = {
      deletedAt: null,
    };

    // Default: show only UNPAID and PARTIAL (exclude PAID)
    if (status) {
      const validStatuses = ['UNPAID', 'PARTIAL', 'PAID'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
      }
      where.paymentStatus = status;
    } else {
      // Default behavior: exclude PAID
      where.paymentStatus = {
        in: ['UNPAID', 'PARTIAL'],
      };
    }

    // Search query (vendorName or reference)
    if (q && q.trim().length > 0) {
      where.OR = [
        { vendorName: { contains: q.trim(), mode: 'insensitive' } },
        { reference: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    // Currency filter
    if (currency && currency.trim().length > 0) {
      where.currency = currency.trim().toUpperCase();
    }

    // Purchase date range
    if (from || to) {
      where.purchaseDate = {};
      if (from) {
        where.purchaseDate.gte = normalizeDate(from);
      }
      if (to) {
        where.purchaseDate.lte = normalizeDate(to);
      }
    }

    // Due date range
    if (dueFrom || dueTo) {
      where.dueDate = {};
      if (dueFrom) {
        where.dueDate.gte = normalizeDate(dueFrom);
      }
      if (dueTo) {
        where.dueDate.lte = normalizeDate(dueTo);
      }
    }

    // Validate sort field
    const allowedSortFields = ['purchaseDate', 'dueDate', 'amount', 'vendorName', 'createdAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'purchaseDate';
    const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    // Execute queries
    const [payables, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDirection },
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
      }),
      prisma.purchase.count({ where }),
    ]);

    // Enrich with computed outstanding amount (Normalized to Major Units)
    const enrichedPayables = payables.map((purchase) => {
      const outstandingCents = purchase.amount - purchase.paidAmountCents;
      return {
        ...purchase,
        amount: purchase.amount / 100, // Major units
        paidAmount: purchase.paidAmountCents / 100, // Major units
        outstanding: outstandingCents / 100, // Major units
        // Remove raw cents fields
        paidAmountCents: undefined,
      };
    });

    return {
      items: enrichedPayables,
      page: pageNum,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('❌ List payables error:', error);
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Failed to list payables: ' + error.message);
  }
};

/**
 * Get payables summary with aggregations
 * @param {object} params - Filter parameters
 * @returns {Promise<object>} Summary statistics
 */
export const getPayablesSummary = async (params = {}) => {
  try {
    const {
      q,
      status,
      currency,
      from,
      to,
      dueFrom,
      dueTo,
    } = params;

    // Build where clause (same as listPayables)
    const where = {
      deletedAt: null,
    };

    // Default: show only UNPAID and PARTIAL
    if (status) {
      const validStatuses = ['UNPAID', 'PARTIAL', 'PAID'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
      }
      where.paymentStatus = status;
    } else {
      where.paymentStatus = {
        in: ['UNPAID', 'PARTIAL'],
      };
    }

    if (q && q.trim().length > 0) {
      where.OR = [
        { vendorName: { contains: q.trim(), mode: 'insensitive' } },
        { reference: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    if (currency && currency.trim().length > 0) {
      where.currency = currency.trim().toUpperCase();
    }

    if (from || to) {
      where.purchaseDate = {};
      if (from) {
        where.purchaseDate.gte = normalizeDate(from);
      }
      if (to) {
        where.purchaseDate.lte = normalizeDate(to);
      }
    }

    if (dueFrom || dueTo) {
      where.dueDate = {};
      if (dueFrom) {
        where.dueDate.gte = normalizeDate(dueFrom);
      }
      if (dueTo) {
        where.dueDate.lte = normalizeDate(dueTo);
      }
    }

    // Get all matching purchases
    const purchases = await prisma.purchase.findMany({
      where,
      select: {
        id: true,
        amount: true,
        paidAmountCents: true,
        paymentStatus: true,
        currency: true,
      },
    });

    // Calculate totals
    const totalCount = purchases.length;
    let totalOutstandingCents = 0;

    const statusBreakdown = {
      UNPAID: { count: 0, outstanding: 0 },
      PARTIAL: { count: 0, outstanding: 0 },
    };

    const currencyBreakdown = {};

    purchases.forEach((purchase) => {
      const outstanding = purchase.amount - purchase.paidAmountCents;
      totalOutstandingCents += outstanding;

      // Status breakdown
      if (statusBreakdown[purchase.paymentStatus]) {
        statusBreakdown[purchase.paymentStatus].count += 1;
        statusBreakdown[purchase.paymentStatus].outstanding += (outstanding / 100);
      }

      // Currency breakdown
      if (!currencyBreakdown[purchase.currency]) {
        currencyBreakdown[purchase.currency] = {
          count: 0,
          outstanding: 0,
        };
      }
      currencyBreakdown[purchase.currency].count += 1;
      currencyBreakdown[purchase.currency].outstanding += (outstanding / 100);
    });

    return {
      totalCount,
      totalOutstanding: totalOutstandingCents / 100, // Major units
      totalsByStatus: statusBreakdown,
      totalsByCurrency: currencyBreakdown,
    };
  } catch (error) {
    console.error('❌ Get payables summary error:', error);
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Failed to get payables summary: ' + error.message);
  }
};

/**
 * Record a payment against a payable (purchase)
 * @param {string} purchaseId - Purchase ID
 * @param {number} amount - Payment amount in major units (PKR)
 * @param {object} actor - User recording the payment
 * @returns {Promise<object>} Updated purchase with outstanding info
 */
export const recordPayablePayment = async (purchaseId, amount, actor) => {
  try {
    // Validate purchaseId
    if (!isValidUUID(purchaseId)) {
      throw new ValidationError('Invalid purchase ID format');
    }

    // Validate actor
    if (!actor || !actor.userId) {
      throw new ValidationError('Actor with userId is required');
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      throw new ValidationError('Payment amount must be a positive number');
    }

    // Convert to cents
    const amountCents = Math.round(amount * 100);

    // Fetch the purchase
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        deletedAt: null,
      },
    });

    if (!purchase) {
      throw new NotFoundError('Purchase');
    }

    // Calculate outstanding
    const outstanding = purchase.amount - purchase.paidAmountCents;

    if (outstanding <= 0) {
      throw new ValidationError('This purchase is already fully paid');
    }

    // Validate payment doesn't exceed outstanding
    if (amountCents > outstanding) {
      throw new ValidationError(
        `Payment amount (${amount}) exceeds outstanding balance (${outstanding / 100})`
      );
    }

    // Calculate new paid amount and status
    const newPaidAmount = purchase.paidAmountCents + amountCents;
    const isFullyPaid = newPaidAmount === purchase.amount;

    const updateData = {
      paidAmountCents: newPaidAmount,
      paymentStatus: isFullyPaid ? 'PAID' : 'PARTIAL',
      updatedById: actor.userId,
    };

    // Set paidAt timestamp when fully paid
    if (isFullyPaid) {
      updateData.paidAt = new Date();
    }

    // Update the purchase
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
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

    // Return with computed outstanding
    return {
      ...updatedPurchase,
      amount: updatedPurchase.amount / 100, // Major units
      paidAmount: updatedPurchase.paidAmountCents / 100, // Major units
      outstanding: (updatedPurchase.amount - updatedPurchase.paidAmountCents) / 100, // Major units
      paymentRecorded: amount, // Major units
      // Remove raw cents fields
      paidAmountCents: undefined,
    };
  } catch (error) {
    console.error('❌ Record payable payment error:', error);
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }

    // Handle Prisma errors
    if (error.code === 'P2025') {
      throw new NotFoundError('Purchase');
    }

    throw new ValidationError('Failed to record payment: ' + error.message);
  }
};
