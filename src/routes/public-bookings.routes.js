import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';

const router = express.Router();

// Public booking creation (no auth)
router.post('/bookings', bookingController.createBooking);

// Public availability endpoints (no auth)
router.post('/bookings/check-availability', bookingController.checkAvailabilityPost);
router.get('/bookings/availability', bookingController.checkAvailability);

export default router;
