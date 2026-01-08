import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import * as financeController from '../controllers/finance.controller.js';
import * as categoryController from '../modules/finance/categories/category.controller.js';
import expenseRoutes from '../modules/finance/expenses/expense.routes.js';

const router = express.Router();

// All finance routes require ADMIN or SUPER_ADMIN access

// Category routes
router.get('/finance/categories', authRequired, requireAdmin, categoryController.getAllCategories);

// Mount modular expense routes
router.use('/finance/expenses', expenseRoutes);

// Payment (Income) routes
router.post('/finance/payments', authRequired, requireAdmin, financeController.recordPayment);
router.get('/finance/payments', authRequired, requireAdmin, financeController.getPaymentHistory);

// Expense routes
router.post('/finance/expenses', authRequired, requireAdmin, financeController.recordExpense);
router.get('/finance/expenses', authRequired, requireAdmin, financeController.getExpenseHistory);

// Commission routes
router.post('/finance/commissions', authRequired, requireAdmin, financeController.recordCommission);
router.get('/finance/commissions', authRequired, requireAdmin, financeController.getCommissionReport);
router.patch('/finance/commissions/:id/status', authRequired, requireAdmin, financeController.updateCommissionStatus);

// Financial summary
router.get('/finance/summary', authRequired, requireAdmin, financeController.getFinancialSummary);

export default router;
