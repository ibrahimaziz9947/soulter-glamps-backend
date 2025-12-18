import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import * as adminBookingController from '../controllers/admin-booking.controller.js';

const router = express.Router();

// All routes require ADMIN or SUPER_ADMIN role
router.get('/bookings', authRequired, requireAdmin, adminBookingController.getAllBookings);
router.get('/bookings/:id', authRequired, requireAdmin, adminBookingController.getBookingById);
router.patch('/bookings/:id/status', authRequired, requireAdmin, adminBookingController.updateBookingStatus);
router.patch('/bookings/:id/assign-agent', authRequired, requireAdmin, adminBookingController.assignAgent);

export default router;
