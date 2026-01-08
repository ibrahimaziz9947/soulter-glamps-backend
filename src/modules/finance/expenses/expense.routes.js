import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as expenseController from './expense.controller.js';

const router = express.Router();

// All expense routes require ADMIN or SUPER_ADMIN access

router.post('/', authRequired, requireAdmin, expenseController.createExpense);
router.get('/', authRequired, requireAdmin, expenseController.getExpenses);
router.get('/:id', authRequired, requireAdmin, expenseController.getExpenseById);
router.patch('/:id', authRequired, requireAdmin, expenseController.updateExpense);
router.delete('/:id', authRequired, requireAdmin, expenseController.deleteExpense);

export default router;
