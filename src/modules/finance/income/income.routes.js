import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as incomeController from './income.controller.js';

const router = express.Router();

// All income routes require ADMIN or SUPER_ADMIN access

// Summary route (must be before /:id to avoid conflict)
router.get('/summary', authRequired, requireAdmin, incomeController.getIncomeSummary);

// CRUD routes
router.post('/', authRequired, requireAdmin, incomeController.createIncome);
router.get('/', authRequired, requireAdmin, incomeController.listIncome);
router.get('/:id', authRequired, requireAdmin, incomeController.getIncomeById);
router.patch('/:id', authRequired, requireAdmin, incomeController.updateIncome);
router.delete('/:id', authRequired, requireAdmin, incomeController.deleteIncome);

// Restore route
router.post('/:id/restore', authRequired, requireAdmin, incomeController.restoreIncome);

export default router;
