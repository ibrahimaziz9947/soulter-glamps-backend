import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin, requireAgent } from '../middleware/roles.js';
import * as leadController from '../controllers/lead.controller.js';

const router = express.Router();

// Protected routes - AGENT can access own leads
router.post('/leads', authRequired, requireAgent, leadController.createLead);
router.get('/leads/my-leads', authRequired, requireAgent, leadController.getAgentLeads);
router.get('/leads/:id', authRequired, requireAgent, leadController.getLeadById);
router.patch('/leads/:id/status', authRequired, requireAgent, leadController.updateLeadStatus);
router.post('/leads/:id/convert', authRequired, requireAgent, leadController.convertLeadToBooking);

// Protected routes - ADMIN and SUPER_ADMIN only
router.get('/leads', authRequired, requireAdmin, leadController.getAllLeads);
router.patch('/leads/:id/assign', authRequired, requireAdmin, leadController.assignLeadToAgent);

export default router;
