import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as dashboardController from './dashboard.controller.js';

const router = express.Router();

/**
 * GET /api/finance/dashboard
 * Get financial dashboard with KPIs and recent transactions
 * @access ADMIN, SUPER_ADMIN
 */
router.get('/', authRequired, requireAdmin, dashboardController.getDashboard);

export default router;
