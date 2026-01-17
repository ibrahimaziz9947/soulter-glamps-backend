/**
 * Super Admin Dashboard Routes
 * Provides endpoints for super admin dashboard metrics and health checks
 */

import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireSuperAdmin } from '../../../middleware/roles.js';
import * as superAdminDashboardController from './super-admin-dashboard.controller.js';

const router = express.Router();

/**
 * @route GET /api/super-admin/dashboard/summary
 * @desc Get super admin dashboard summary (bookings, revenue, commissions, finance, health)
 * @access SUPER_ADMIN
 */
router.get('/summary', authRequired, requireSuperAdmin, superAdminDashboardController.getDashboardSummary);

/**
 * @route GET /api/super-admin/dashboard/ping
 * @desc Health check endpoint for database connectivity
 * @access SUPER_ADMIN
 */
router.get('/ping', authRequired, requireSuperAdmin, superAdminDashboardController.ping);

export default router;
