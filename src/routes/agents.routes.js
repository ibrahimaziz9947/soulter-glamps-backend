import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin, requireAgent } from '../middleware/roles.js';

const router = express.Router();

// Example routes - to be implemented

// Get all agents (ADMIN+)
// router.get('/agents', authRequired, requireAdmin, getAllAgents);

// Get single agent
// router.get('/agents/:id', authRequired, requireAgent, getAgentById);

// Update agent
// router.put('/agents/:id', authRequired, requireAdmin, updateAgent);

// Delete agent
// router.delete('/agents/:id', authRequired, requireAdmin, deleteAgent);

export default router;
