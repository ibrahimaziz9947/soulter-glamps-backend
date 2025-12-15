import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin, requireAgent } from '../middleware/roles.js';
import * as commissionController from '../controllers/commission.controller.js';

const router = express.Router();

// Agent routes - view own commissions
router.get('/my-commissions', authRequired, requireAgent, commissionController.getMyCommissions);
router.get('/my-commissions/summary', authRequired, requireAgent, commissionController.getMyCommissionSummary);

// Admin routes - manage all commissions
router.get('/', authRequired, requireAdmin, commissionController.getAllCommissions);
router.get('/agent/:agentId/summary', authRequired, requireAdmin, commissionController.getAgentCommissionSummary);
router.get('/:id', authRequired, commissionController.getCommissionById); // Accessible by agent (own) or admin (all)
router.patch('/:id/status', authRequired, requireAdmin, commissionController.updateCommissionStatus);

export default router;
