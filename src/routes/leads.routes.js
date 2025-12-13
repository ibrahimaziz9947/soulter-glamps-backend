import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin, requireAgent } from '../middleware/roles.js';

const router = express.Router();

// Example routes - to be implemented

// Get all agent leads (AGENT+)
// router.get('/leads', authRequired, requireAgent, getAllLeads);

// Create new lead
// router.post('/leads', authRequired, requireAgent, createLead);

// Get single lead
// router.get('/leads/:id', authRequired, requireAgent, getLeadById);

// Update lead
// router.put('/leads/:id', authRequired, requireAgent, updateLead);

// Delete lead
// router.delete('/leads/:id', authRequired, requireAdmin, deleteLead);

export default router;
