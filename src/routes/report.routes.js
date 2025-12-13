import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = express.Router();

// Placeholder for report routes
// These will be implemented later

// Example protected routes:
// router.get('/reports/bookings', authRequired, requireAdmin, getBookingReports);
// router.get('/reports/revenue', authRequired, requireAdmin, getRevenueReports);
// router.get('/reports/commissions', authRequired, requireAdmin, getCommissionReports);
// router.get('/reports/agents', authRequired, requireAdmin, getAgentReports);

export default router;
