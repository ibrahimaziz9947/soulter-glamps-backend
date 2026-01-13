import * as payablesService from './payables.service.js';
import { asyncHandler } from '../../../utils/errors.js';

/**
 * List all payables with filters and pagination
 * @route GET /api/finance/payables
 * @access ADMIN, SUPER_ADMIN
 */
export const listPayables = asyncHandler(async (req, res) => {
  const {
    page,
    pageSize,
    q,
    status,
    currency,
    from,
    to,
    dueFrom,
    dueTo,
    sortBy,
    sortOrder,
  } = req.query;

  const filters = {
    page,
    pageSize,
    q,
    status,
    currency,
    from,
    to,
    dueFrom,
    dueTo,
    sortBy,
    sortOrder,
  };

  const result = await payablesService.listPayables(filters);

  return res.status(200).json({
    success: true,
    data: result.items,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
});

/**
 * Get payables summary with aggregations
 * @route GET /api/finance/payables/summary
 * @access ADMIN, SUPER_ADMIN
 */
export const getPayablesSummary = asyncHandler(async (req, res) => {
  const {
    q,
    status,
    currency,
    from,
    to,
    dueFrom,
    dueTo,
  } = req.query;

  const filters = {
    q,
    status,
    currency,
    from,
    to,
    dueFrom,
    dueTo,
  };

  const summary = await payablesService.getPayablesSummary(filters);

  return res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * Record a payment against a payable
 * @route POST /api/finance/payables/:purchaseId/pay
 * @access ADMIN, SUPER_ADMIN
 * 
 * Sample curl:
 * curl -X POST http://localhost:5001/api/finance/payables/{purchaseId}/pay \
 *   -H "Authorization: Bearer YOUR_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"amountCents": 50000}'
 */
export const recordPayment = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;
  const { amountCents } = req.body;
  const userId = req.user.id;
  const actor = { userId };

  // Validate amountCents
  if (amountCents === undefined || amountCents === null) {
    return res.status(400).json({
      success: false,
      error: 'Payment amount (amountCents) is required',
    });
  }

  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents)) {
    return res.status(400).json({
      success: false,
      error: 'Payment amount must be an integer (cents)',
    });
  }

  if (amountCents <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Payment amount must be greater than zero',
    });
  }

  // Validate purchaseId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(purchaseId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid purchase ID format',
    });
  }

  const result = await payablesService.recordPayablePayment(
    purchaseId,
    amountCents,
    actor
  );

  return res.status(200).json({
    success: true,
    message: 'Payment recorded successfully',
    data: result,
  });
});
