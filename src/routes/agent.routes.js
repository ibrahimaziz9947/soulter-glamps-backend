import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAgent } from '../middleware/roles.js';
import * as bookingController from '../controllers/booking.controller.js';
import * as commissionController from '../controllers/commission.controller.js';

const router = express.Router();

// Agent-specific routes for viewing their own bookings and commissions

// Get bookings referred by the agent (uses main getAllBookings with role-based filtering)
router.get('/bookings', authRequired, requireAgent, bookingController.getAllBookings);

// Get commissions earned by the agent
router.get('/commissions', authRequired, requireAgent, commissionController.getMyCommissions);
router.get('/commissions/summary', authRequired, requireAgent, commissionController.getMyCommissionSummary);

export default router;
