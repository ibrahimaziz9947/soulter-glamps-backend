import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as profitLossController from './profitLoss.controller.js';

const router = express.Router();

// All P&L routes require ADMIN or SUPER_ADMIN access

// Summary route (must be before generic route to avoid conflict)
router.get('/summary', authRequired, requireAdmin, profitLossController.getProfitAndLossSummary);

// Get full Profit & Loss statement with breakdown
router.get('/', authRequired, requireAdmin, profitLossController.getProfitAndLoss);

export default router;
