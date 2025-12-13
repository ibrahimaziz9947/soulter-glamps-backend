import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireSuperAdmin, requireAdmin, requireAgent } from '../middleware/roles.js';

const router = express.Router();

// Test route for SUPER_ADMIN only
router.get('/test/super-admin', authRequired, requireSuperAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'SUPER_ADMIN access granted',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// Test route for ADMIN and above (SUPER_ADMIN, ADMIN)
router.get('/test/admin', authRequired, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'ADMIN access granted',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// Test route for AGENT and above (SUPER_ADMIN, ADMIN, AGENT)
router.get('/test/agent', authRequired, requireAgent, (req, res) => {
  res.json({
    success: true,
    message: 'AGENT access granted',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default router;
