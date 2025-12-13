import * as financeService from '../services/finance.service.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * Record a payment (income)
 * @route POST /api/finance/payments
 * @access ADMIN, SUPER_ADMIN
 */
export const recordPayment = asyncHandler(async (req, res) => {
  const income = await financeService.recordPayment(req.body);

  return res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: income,
  });
});

/**
 * Record an expense
 * @route POST /api/finance/expenses
 * @access ADMIN, SUPER_ADMIN
 */
export const recordExpense = asyncHandler(async (req, res) => {
  const expense = await financeService.recordExpense(req.body);

  return res.status(201).json({
    success: true,
    message: 'Expense recorded successfully',
    data: expense,
  });
});

/**
 * Get payment history
 * @route GET /api/finance/payments
 * @access ADMIN, SUPER_ADMIN
 */
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const { page, limit, source, fromDate, toDate, search } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { source, fromDate, toDate, search };

  const { payments, total, totalAmount } = await financeService.getPaymentHistory(filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: payments,
    pagination: meta,
    summary: { totalAmount },
  });
});

/**
 * Get expense history
 * @route GET /api/finance/expenses
 * @access ADMIN, SUPER_ADMIN
 */
export const getExpenseHistory = asyncHandler(async (req, res) => {
  const { page, limit, category, fromDate, toDate, search } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { category, fromDate, toDate, search };

  const { expenses, total, totalAmount } = await financeService.getExpenseHistory(filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: expenses,
    pagination: meta,
    summary: { totalAmount },
  });
});

/**
 * Record agent commission
 * @route POST /api/finance/commissions
 * @access ADMIN, SUPER_ADMIN
 */
export const recordCommission = asyncHandler(async (req, res) => {
  const commission = await financeService.recordCommission(req.body);

  return res.status(201).json({
    success: true,
    message: 'Commission recorded successfully',
    data: commission,
  });
});

/**
 * Update commission status
 * @route PATCH /api/finance/commissions/:id/status
 * @access ADMIN, SUPER_ADMIN
 */
export const updateCommissionStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const commission = await financeService.updateCommissionStatus(parseInt(id), status);

  return res.status(200).json({
    success: true,
    message: 'Commission status updated successfully',
    data: commission,
  });
});

/**
 * Get commission report
 * @route GET /api/finance/commissions
 * @access ADMIN, SUPER_ADMIN
 */
export const getCommissionReport = asyncHandler(async (req, res) => {
  const { page, limit, agentId, status, fromDate, toDate } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { agentId, status, fromDate, toDate };

  const { commissions, total, summary } = await financeService.getCommissionReport(filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: commissions,
    pagination: meta,
    summary,
  });
});

/**
 * Get financial summary
 * @route GET /api/finance/summary
 * @access ADMIN, SUPER_ADMIN
 */
export const getFinancialSummary = asyncHandler(async (req, res) => {
  const { fromDate, toDate } = req.query;
  
  const filters = { fromDate, toDate };
  const summary = await financeService.getFinancialSummary(filters);

  return res.status(200).json({
    success: true,
    data: summary,
  });
});
