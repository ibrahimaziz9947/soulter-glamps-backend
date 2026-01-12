import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as expenseController from './expense.controller.js';

const router = express.Router();

// All expense routes require ADMIN or SUPER_ADMIN access

// CRUD routes
router.post('/', authRequired, requireAdmin, expenseController.createExpense);
router.get('/', authRequired, requireAdmin, expenseController.getExpenses);
router.get('/:id', authRequired, requireAdmin, expenseController.getExpenseById);
router.patch('/:id', authRequired, requireAdmin, expenseController.updateExpense);
router.delete('/:id', authRequired, requireAdmin, expenseController.deleteExpense);

// Workflow routes
router.post('/:id/submit', authRequired, requireAdmin, expenseController.submitExpense);
router.post('/:id/approve', authRequired, requireAdmin, expenseController.approveExpense);
router.post('/:id/reject', authRequired, requireAdmin, expenseController.rejectExpense);
router.post('/:id/cancel', authRequired, requireAdmin, expenseController.cancelExpense);

export default router;
