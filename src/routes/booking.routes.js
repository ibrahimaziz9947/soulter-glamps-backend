import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAgent } from '../middleware/roles.js';
import * as bookingController from '../controllers/booking.controller.js';

const router = express.Router();

// Public route - Anyone can create a booking
router.post('/', bookingController.createBooking);

// Protected routes - Auth required with role-based access
router.get('/', authRequired, bookingController.getAllBookings);
router.get('/:id', authRequired, bookingController.getBookingById);

// Admin/Agent routes - Status updates (requireAgent allows SUPER_ADMIN, ADMIN, and AGENT)
router.patch('/:id/status', authRequired, requireAgent, bookingController.updateBookingStatus);

export default router;
