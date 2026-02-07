import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { uploadReceipt } from '../middleware/upload.js';

const router = express.Router();

// Public booking creation (no auth)
router.post('/bookings', bookingController.createBooking);

// Public receipt upload
router.post('/bookings/:bookingId/receipt', uploadReceipt.single('receipt'), bookingController.uploadReceipt);

// Public availability endpoints (no auth)
router.post('/bookings/check-availability', bookingController.checkAvailabilityPost);
router.get('/bookings/availability', bookingController.checkAvailability);

export default router;
