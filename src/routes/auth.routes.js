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
  console.log('✅ /api/auth/me called - User authenticated:', req.user.email, req.user.role);
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

// Logout endpoint
router.post('/logout', (req, res) => {
  console.log('🔓 Logout requested');
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Protected routes - SUPER_ADMIN only
router.post('/create-user', authRequired, requireSuperAdmin, createUser);

export default router;
