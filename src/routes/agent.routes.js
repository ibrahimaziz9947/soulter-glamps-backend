import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/roles.js';

const router = express.Router();

// Placeholder for agent routes
// These will be implemented later

// Example protected routes:
// router.get('/agents', authRequired, requireAdmin, getAgents);
// router.post('/agents', authRequired, requireSuperAdmin, createAgent);
// router.put('/agents/:id', authRequired, requireAdmin, updateAgent);
// router.delete('/agents/:id', authRequired, requireSuperAdmin, deleteAgent);

export default router;
