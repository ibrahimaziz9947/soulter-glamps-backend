import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireSuperAdmin, requireAdmin, requireAgent } from '../middleware/roles.js';

const router = express.Router();

// SUPER_ADMIN only route
router.get('/super-admin/test', authRequired, requireSuperAdmin, (req, res) => {
  console.log('✅ SUPER_ADMIN test route accessed by:', req.user.email);
  res.status(200).json({
    success: true,
    message: 'Welcome SUPER_ADMIN!',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// ADMIN route (SUPER_ADMIN and ADMIN can access)
router.get('/admin/test', authRequired, requireAdmin, (req, res) => {
  console.log('✅ ADMIN test route accessed by:', req.user.email);
  res.status(200).json({
    success: true,
    message: 'Welcome ADMIN or SUPER_ADMIN!',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// AGENT route (all authenticated users can access)
router.get('/agent/test', authRequired, requireAgent, (req, res) => {
  console.log('✅ AGENT test route accessed by:', req.user.email);
  res.status(200).json({
    success: true,
    message: 'Welcome AGENT, ADMIN, or SUPER_ADMIN!',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default router;
