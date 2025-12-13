import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin, requireAgent } from '../middleware/roles.js';

const router = express.Router();

// Example routes - to be implemented

// Get all commissions for logged-in agent
// router.get('/commissions', authRequired, requireAgent, getMyCommissions);

// Get all commissions (ADMIN+)
// router.get('/commissions/all', authRequired, requireAdmin, getAllCommissions);

// Create commission (ADMIN+)
// router.post('/commissions', authRequired, requireAdmin, createCommission);

// Update commission status (ADMIN+)
// router.patch('/commissions/:id/status', authRequired, requireAdmin, updateCommissionStatus);

// Get commission by ID
// router.get('/commissions/:id', authRequired, requireAgent, getCommissionById);

export default router;
