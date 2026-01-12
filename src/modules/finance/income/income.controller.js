import * as incomeService from './income.service.js';
import { asyncHandler } from '../../../utils/errors.js';

/**
 * List all income records with filters and pagination
 * @route GET /api/finance/income
 * @access ADMIN, SUPER_ADMIN
 */
export const listIncome = asyncHandler(async (req, res) => {
  const { page, limit, q, status, source, bookingId, dateFrom, dateTo, includeDeleted } = req.query;

  const filters = {
    page,
    limit,
    q,
    status,
    source,
    bookingId,
    dateFrom,
    dateTo,
    includeDeleted: includeDeleted === 'true',
  };

  const result = await incomeService.listIncome(filters);

  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    summary: result.summary,
  });
});

/**
 * Get income summary with aggregations
 * @route GET /api/finance/income/summary
 * @access ADMIN, SUPER_ADMIN
 */
export const getIncomeSummary = asyncHandler(async (req, res) => {
  const { status, source, bookingId, dateFrom, dateTo } = req.query;

  const filters = {
    status,
    source,
    bookingId,
    dateFrom,
    dateTo,
  };

  const summary = await incomeService.incomeSummary(filters);

  return res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * Create a new income record
 * @route POST /api/finance/income
 * @access ADMIN, SUPER_ADMIN
 */
export const createIncome = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const actor = { userId };

  // Controller-level validation
  const { amount, currency, source, bookingId } = req.body;

  // Validate amount
  if (amount === undefined || amount === null) {
    return res.status(400).json({
      success: false,
      error: 'Amount is required',
    });
  }

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Amount must be a positive integer (cents)',
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

  // Validate source
  if (!source) {
    return res.status(400).json({
      success: false,
      error: 'Source is required',
    });
  }

  const validSources = ['BOOKING', 'MANUAL', 'OTHER'];
  if (!validSources.includes(source)) {
    return res.status(400).json({
      success: false,
      error: `Source must be one of: ${validSources.join(', ')}`,
    });
  }

  // Validate bookingId when source is BOOKING
  if (source === 'BOOKING' && !bookingId) {
    return res.status(400).json({
      success: false,
      error: 'Booking ID is required when source is BOOKING',
    });
  }

  const income = await incomeService.createIncome(req.body, actor);

  return res.status(201).json({
    success: true,
    message: 'Income record created successfully',
    data: income,
  });
});

/**
 * Get income by ID
 * @route GET /api/finance/income/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const getIncomeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const income = await incomeService.getIncomeById(id);

  return res.status(200).json({
    success: true,
    data: income,
  });
});

/**
 * Update income record
 * @route PATCH /api/finance/income/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const updateIncome = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const actor = { userId };

  // Controller-level validation for provided fields
  const { amount, currency, source, bookingId } = req.body;

  // Validate amount if provided
  if (amount !== undefined) {
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive integer (cents)',
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

  // Validate source if provided
  if (source !== undefined) {
    const validSources = ['BOOKING', 'MANUAL', 'OTHER'];
    if (!validSources.includes(source)) {
      return res.status(400).json({
        success: false,
        error: `Source must be one of: ${validSources.join(', ')}`,
      });
    }

    // If changing to BOOKING, ensure bookingId is provided or already exists
    if (source === 'BOOKING' && bookingId === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID is required when source is BOOKING',
      });
    }
  }

  const income = await incomeService.updateIncome(id, req.body, actor);

  return res.status(200).json({
    success: true,
    message: 'Income record updated successfully',
    data: income,
  });
});

/**
 * Soft delete income record
 * @route DELETE /api/finance/income/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const deleteIncome = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const actor = { userId };

  await incomeService.softDeleteIncome(id, actor);

  return res.status(200).json({
    success: true,
    message: 'Income record deleted successfully',
  });
});

/**
 * Restore soft-deleted income record
 * @route POST /api/finance/income/:id/restore
 * @access ADMIN, SUPER_ADMIN
 */
export const restoreIncome = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const actor = { userId };

  const income = await incomeService.restoreIncome(id, actor);

  return res.status(200).json({
    success: true,
    message: 'Income record restored successfully',
    data: income,
  });
});
