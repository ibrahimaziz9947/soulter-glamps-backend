import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin, requireAgent } from '../middleware/roles.js';
import * as bookingController from '../controllers/booking.controller.js';

const router = express.Router();

// Public routes (customers can book without login)
router.post('/bookings', bookingController.createBooking);
router.get('/bookings/:id', bookingController.getBookingById);

// Protected routes - AGENT
router.get('/bookings/my-bookings', authRequired, requireAgent, bookingController.getAgentBookings);

// Protected routes - ADMIN and SUPER_ADMIN
router.get('/bookings', authRequired, requireAdmin, bookingController.getAllBookings);
router.put('/bookings/:id', authRequired, requireAdmin, bookingController.updateBooking);
router.patch('/bookings/:id/status', authRequired, requireAdmin, bookingController.updateBookingStatus);

export default router;
