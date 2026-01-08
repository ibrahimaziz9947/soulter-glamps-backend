import * as expenseService from './expense.service.js';
import { asyncHandler } from '../../../utils/errors.js';

/**
 * Create a new expense
 * @route POST /api/finance/expenses
 * @access ADMIN, SUPER_ADMIN
 */
export const createExpense = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const expense = await expenseService.createExpense(req.body, userId);

  return res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: expense,
  });
});

/**
 * Get all expenses with filters and pagination
 * @route GET /api/finance/expenses
 * @access ADMIN, SUPER_ADMIN
 */
export const getExpenses = asyncHandler(async (req, res) => {
  const { page, limit, categoryId, fromDate, toDate, search } = req.query;

  const filters = {
    page,
    limit,
    categoryId,
    fromDate,
    toDate,
    search,
  };

  const result = await expenseService.getExpenses(filters);

  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    summary: result.summary,
  });
});

/**
 * Get expense by ID
 * @route GET /api/finance/expenses/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const getExpenseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expense = await expenseService.getExpenseById(id);

  return res.status(200).json({
    success: true,
    data: expense,
  });
});

/**
 * Update expense
 * @route PATCH /api/finance/expenses/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const expense = await expenseService.updateExpense(id, req.body, userId);

  return res.status(200).json({
    success: true,
    message: 'Expense updated successfully',
    data: expense,
  });
});

/**
 * Delete expense (soft delete)
 * @route DELETE /api/finance/expenses/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  await expenseService.softDeleteExpense(id, userId);

  return res.status(200).json({
    success: true,
    message: 'Expense deleted successfully',
  });
});
