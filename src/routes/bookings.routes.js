import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = express.Router();

// Example routes - to be implemented

// Get all bookings (ADMIN+)
// router.get('/bookings', authRequired, requireAdmin, getAllBookings);

// Create booking (Public - no auth required for customers)
// router.post('/bookings', createBooking);

// Get single booking
// router.get('/bookings/:id', getBookingById);

// Update booking (ADMIN+)
// router.put('/bookings/:id', authRequired, requireAdmin, updateBooking);

// Cancel booking
// router.patch('/bookings/:id/cancel', cancelBooking);

// Delete booking (ADMIN+)
// router.delete('/bookings/:id', authRequired, requireAdmin, deleteBooking);

export default router;
