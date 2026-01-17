/**
 * Super Admin Routes
 * Main router for all super admin endpoints
 */

import express from 'express';
import superAdminDashboardRoutes from '../modules/super-admin/dashboard/super-admin-dashboard.routes.js';

const router = express.Router();

// Dashboard routes
router.use('/dashboard', superAdminDashboardRoutes);

export default router;
