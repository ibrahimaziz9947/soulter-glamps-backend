/**
 * Admin Dashboard Routes
 * Provides endpoints for admin dashboard KPI metrics
 */

import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as adminDashboardController from './admin-dashboard.controller.js';

const router = express.Router();

/**
 * @route GET /api/admin/dashboard/summary
 * @desc Get admin dashboard KPI summary (total bookings, revenue, occupancy, active staff)
 * @access ADMIN, SUPER_ADMIN
 */
router.get('/summary', authRequired, requireAdmin, adminDashboardController.getDashboardSummary);

export default router;
