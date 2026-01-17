/**
 * Super Admin Bookings Routes
 * Routes for super admin booking management
 * 
 * All routes require SUPER_ADMIN authentication
 */

import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireSuperAdmin } from '../../../middleware/roles.js';
import * as bookingsController from './super-admin-bookings.controller.js';

const router = express.Router();

/**
 * GET /api/super-admin/bookings
 * Get all bookings with filtering and pagination
 * 
 * Query params:
 * - from: Start date (ISO/YYYY-MM-DD, optional)
 * - to: End date (ISO/YYYY-MM-DD, optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by booking status (optional)
 * - search: Search customer name/email/booking ID (optional)
 * - sort: Sort field and direction (default: createdAt_desc)
 */
router.get('/', authRequired, requireSuperAdmin, bookingsController.getAllBookings);

/**
 * GET /api/super-admin/bookings/:id
 * Get single booking with full details including related entities
 */
router.get('/:id', authRequired, requireSuperAdmin, bookingsController.getBookingById);

export default router;
