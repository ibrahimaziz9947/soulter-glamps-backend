/**
 * Super Admin Routes
 * Main router for all super admin endpoints
 */

import express from 'express';
import superAdminDashboardRoutes from '../modules/super-admin/dashboard/super-admin-dashboard.routes.js';
import superAdminBookingsRoutes from '../modules/super-admin/bookings/super-admin-bookings.routes.js';
import superAdminCommissionsRoutes from '../modules/super-admin/commissions/super-admin-commissions.routes.js';

const router = express.Router();

// Dashboard routes
router.use('/dashboard', superAdminDashboardRoutes);

// Bookings routes
router.use('/bookings', superAdminBookingsRoutes);

// Commissions routes
router.use('/commissions', superAdminCommissionsRoutes);

export default router;
