/**
 * Super Admin Commissions Routes
 * Routes for super admin commission management
 * 
 * All routes require SUPER_ADMIN authentication
 * Base path: /api/super-admin/commissions
 */

import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireSuperAdmin } from '../../../middleware/roles.js';
import * as commissionsController from './super-admin-commissions.controller.js';

const router = express.Router();

/**
 * GET /api/super-admin/commissions
 * Get all commissions with filtering, pagination, and aggregations
 * 
 * Query params:
 * - from: Start date (YYYY-MM-DD or ISO datetime, optional)
 * - to: End date (YYYY-MM-DD or ISO datetime, optional)
 * - status: Commission status filter (optional)
 * - agentId: Filter by agent ID (optional)
 * - bookingId: Filter by booking ID (optional)
 * - search: Search term (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sort: Sort field and direction (default: createdAt_desc)
 */
router.get('/', authRequired, requireSuperAdmin, commissionsController.getAllCommissions);

/**
 * GET /api/super-admin/commissions/:id
 * Get single commission with full details including related entities
 */
router.get('/:id', authRequired, requireSuperAdmin, commissionsController.getCommissionById);

/**
 * POST /api/super-admin/commissions/:id/mark-paid
 * Mark commission as paid
 * 
 * Body:
 * {
 *   paidAt?: string (ISO datetime),
 *   note?: string,
 *   paymentMethod?: string,
 *   reference?: string
 * }
 */
router.post('/:id/mark-paid', authRequired, requireSuperAdmin, commissionsController.markCommissionAsPaid);

/**
 * POST /api/super-admin/commissions/:id/mark-unpaid
 * Mark commission as unpaid (revert from PAID status)
 * 
 * Body:
 * {
 *   reason?: string
 * }
 */
router.post('/:id/mark-unpaid', authRequired, requireSuperAdmin, commissionsController.markCommissionAsUnpaid);

export default router;
