import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/roles.js';

const router = express.Router();

// Example routes - to be implemented

// Generate booking report (ADMIN+)
// router.post('/reports/bookings', authRequired, requireAdmin, generateBookingReport);

// Generate financial report (ADMIN+)
// router.post('/reports/financial', authRequired, requireAdmin, generateFinancialReport);

// Generate agent commission report (ADMIN+)
// router.post('/reports/commissions', authRequired, requireAdmin, generateCommissionReport);

// Generate occupancy report (ADMIN+)
// router.post('/reports/occupancy', authRequired, requireAdmin, generateOccupancyReport);

// Get all saved reports (ADMIN+)
// router.get('/reports', authRequired, requireAdmin, getAllReports);

// Get report by ID (ADMIN+)
// router.get('/reports/:id', authRequired, requireAdmin, getReportById);

// Delete report (SUPER_ADMIN)
// router.delete('/reports/:id', authRequired, requireSuperAdmin, deleteReport);

export default router;
