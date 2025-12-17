import express from 'express';
import { login, adminLogin, agentLogin, superAdminLogin, createUser } from '../controllers/auth.controller.js';
import { authRequired } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roles.js';

const router = express.Router();

// Public routes - Role-specific login endpoints
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/agent/login', agentLogin);
router.post('/super-admin/login', superAdminLogin);

// Protected routes - Auth verification
router.get('/me', authRequired, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// Protected routes - SUPER_ADMIN only
router.post('/create-user', authRequired, requireSuperAdmin, createUser);

export default router;
