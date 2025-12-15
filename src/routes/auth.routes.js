console.log("🔵 AUTH ROUTES FILE LOADED");

import express from 'express';
import { login, adminLogin, agentLogin, superAdminLogin, createUser } from '../controllers/auth.controller.js';
import { authRequired } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roles.js';

const router = express.Router();

console.log("🔵 Creating auth router...");

// Public routes - Role-specific login endpoints
router.post('/login', login); // Generic login (defaults to Admin for backward compatibility)
console.log("🔵 POST /login registered");

router.post('/admin/login', adminLogin); // Admin-only login
console.log("🔵 POST /admin/login registered");

router.post('/agent/login', agentLogin); // Agent-only login
console.log("🔵 POST /agent/login registered");

router.post('/super-admin/login', superAdminLogin); // Super Admin-only login
console.log("🔵 POST /super-admin/login registered");

// Protected routes - SUPER_ADMIN only
router.post('/create-user', authRequired, requireSuperAdmin, createUser);
console.log("🔵 POST /create-user registered");

console.log("🔵 AUTH ROUTES EXPORT READY");

export default router;
