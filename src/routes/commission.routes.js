import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import * as commissionController from '../controllers/commission.controller.js';

const router = express.Router();

// All commission management routes (same as commissions.routes.js)
// Admin routes - manage all commissions
router.get('/', authRequired, requireAdmin, commissionController.getAllCommissions);
router.get('/agent/:agentId/summary', authRequired, requireAdmin, commissionController.getAgentCommissionSummary);
router.get('/:id', authRequired, commissionController.getCommissionById);
router.patch('/:id/status', authRequired, requireAdmin, commissionController.updateCommissionStatus);

export default router;
