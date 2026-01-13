import * as purchaseService from './purchase.service.js';
import { asyncHandler } from '../../../utils/errors.js';

/**
 * List all purchase records with filters and pagination
 * @route GET /api/finance/purchases
 * @access ADMIN, SUPER_ADMIN
 */
export const listPurchases = asyncHandler(async (req, res) => {
  const { page, limit, q, status, currency, vendorName, dateFrom, dateTo } = req.query;

  const filters = {
    page,
    limit,
    q,
    status,
    currency,
    vendorName,
    dateFrom,
    dateTo,
  };

  const result = await purchaseService.listPurchases(filters);

  return res.status(200).json({
    success: true,
    data: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
    summary: result.summary,
  });
});

/**
 * Get purchase summary with aggregations
 * @route GET /api/finance/purchases/summary
 * @access ADMIN, SUPER_ADMIN
 */
export const getPurchasesSummary = asyncHandler(async (req, res) => {
  const { status, currency, vendorName, dateFrom, dateTo } = req.query;

  const filters = {
    status,
    currency,
    vendorName,
    dateFrom,
    dateTo,
  };

  const summary = await purchaseService.getPurchasesSummary(filters);

  return res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * Create a new purchase record
 * @route POST /api/finance/purchases
 * @access ADMIN, SUPER_ADMIN
 */
export const createPurchase = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const actor = { userId };

  // Controller-level validation
  const { amount, currency, purchaseDate, vendorName, status } = req.body;

  // Validate amount
  if (amount === undefined || amount === null) {
    return res.status(400).json({
      success: false,
      error: 'Amount is required',
    });
  }

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0) {
    return res.status(400).json({
      success: false,
      error: 'Amount must be a non-negative integer (cents)',
    });
  }

  // Validate currency
  if (!currency || typeof currency !== 'string' || currency.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Currency is required',
    });
  }

  if (currency.trim().length !== 3) {
    return res.status(400).json({
      success: false,
      error: 'Currency must be 3 characters (e.g., USD, EUR)',
    });
  }

  // Validate purchaseDate
  if (!purchaseDate) {
    return res.status(400).json({
      success: false,
      error: 'Purchase date is required',
    });
  }

  const parsedDate = new Date(purchaseDate);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'Purchase date must be a valid date',
    });
  }

  // Validate vendorName
  if (!vendorName || typeof vendorName !== 'string' || vendorName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Vendor name is required',
    });
  }

  // Validate status if provided
  if (status !== undefined) {
    const validStatuses = ['DRAFT', 'CONFIRMED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }
  }

  const purchase = await purchaseService.createPurchase(req.body, actor);

  return res.status(201).json({
    success: true,
    message: 'Purchase record created successfully',
    data: purchase,
  });
});

/**
 * Get purchase by ID
 * @route GET /api/finance/purchases/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const getPurchaseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const purchase = await purchaseService.getPurchaseById(id);

  return res.status(200).json({
    success: true,
    data: purchase,
  });
});

/**
 * Update purchase record
 * @route PATCH /api/finance/purchases/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const updatePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const actor = { userId };

  // Controller-level validation for provided fields
  const { amount, currency, purchaseDate, vendorName, status } = req.body;

  // Validate amount if provided
  if (amount !== undefined) {
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a non-negative integer (cents)',
      });
    }
  }

  // Validate currency if provided
  if (currency !== undefined) {
    if (typeof currency !== 'string' || currency.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Currency cannot be empty',
      });
    }

    if (currency.trim().length !== 3) {
      return res.status(400).json({
        success: false,
        error: 'Currency must be 3 characters (e.g., USD, EUR)',
      });
    }
  }

  // Validate purchaseDate if provided
  if (purchaseDate !== undefined) {
    const parsedDate = new Date(purchaseDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Purchase date must be a valid date',
      });
    }
  }

  // Validate vendorName if provided
  if (vendorName !== undefined) {
    if (typeof vendorName !== 'string' || vendorName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vendor name cannot be empty',
      });
    }
  }

  // Validate status if provided
  if (status !== undefined) {
    const validStatuses = ['DRAFT', 'CONFIRMED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }
  }

  const purchase = await purchaseService.updatePurchase(id, req.body, actor);

  return res.status(200).json({
    success: true,
    message: 'Purchase record updated successfully',
    data: purchase,
  });
});

/**
 * Soft delete purchase record
 * @route DELETE /api/finance/purchases/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const deletePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const actor = { userId };

  await purchaseService.softDeletePurchase(id, actor);

  return res.status(200).json({
    success: true,
    message: 'Purchase record deleted successfully',
  });
});

/**
 * Restore soft-deleted purchase record
 * @route POST /api/finance/purchases/:id/restore
 * @access ADMIN, SUPER_ADMIN
 */
export const restorePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const actor = { userId };

  const purchase = await purchaseService.restorePurchase(id, actor);

  return res.status(200).json({
    success: true,
    message: 'Purchase record restored successfully',
    data: purchase,
  });
});
