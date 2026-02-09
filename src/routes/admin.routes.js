import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import * as adminBookingController from '../controllers/admin-booking.controller.js';
import adminDashboardRoutes from '../modules/admin/dashboard/admin-dashboard.routes.js';
import adminStaffRoutes from '../modules/admin/staff/admin-staff.routes.js';
import adminBookingCreateRoutes from '../modules/admin/bookings/admin-booking.routes.js';

const router = express.Router();

// Dashboard routes
router.use('/dashboard', adminDashboardRoutes);

// Staff management routes
router.use('/staff', adminStaffRoutes);

// Booking creation routes (admin-enhanced)
router.use('/bookings', adminBookingCreateRoutes);

// Legacy booking routes - all require ADMIN or SUPER_ADMIN role
router.get('/bookings', authRequired, requireAdmin, adminBookingController.getAllBookings);
router.get('/bookings/:id', authRequired, requireAdmin, adminBookingController.getBookingById);
router.patch('/bookings/:id/status', authRequired, requireAdmin, adminBookingController.updateBookingStatus);
router.patch('/bookings/:id/assign-agent', authRequired, requireAdmin, adminBookingController.assignAgent);
router.get('/bookings/:bookingId/receipt', authRequired, requireAdmin, adminBookingController.getBookingReceipt);

export default router;
