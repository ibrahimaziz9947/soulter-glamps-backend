/**
 * Admin Booking Creation Routes
 */

import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as adminBookingController from './admin-booking.controller.js';

const router = express.Router();

/**
 * @route POST /api/admin/bookings
 * @desc Create a new booking (admin version with validation)
 * @access ADMIN, SUPER_ADMIN
 */
router.post('/', authRequired, requireAdmin, adminBookingController.createBooking);

export default router;
