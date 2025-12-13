import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = express.Router();

// Placeholder for commission routes
// These will be implemented later

// Example protected routes:
// router.get('/commissions', authRequired, requireAdmin, getCommissions);
// router.post('/commissions', authRequired, requireAdmin, createCommission);
// router.put('/commissions/:id', authRequired, requireAdmin, updateCommission);
// router.delete('/commissions/:id', authRequired, requireAdmin, deleteCommission);

export default router;
