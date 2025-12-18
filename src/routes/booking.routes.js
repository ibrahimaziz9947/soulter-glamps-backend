import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAgent } from '../middleware/roles.js';
import * as bookingController from '../controllers/booking.controller.js';

const router = express.Router();

// Public routes - Anyone can create or view a booking
router.post('/', bookingController.createBooking);
router.get('/:id', bookingController.getBookingById);

// Protected routes - Auth required with role-based access
router.get('/', authRequired, bookingController.getAllBookings);

// Admin/Agent routes - Status updates (requireAgent allows SUPER_ADMIN, ADMIN, and AGENT)
router.patch('/:id/status', authRequired, requireAgent, bookingController.updateBookingStatus);

export default router;
