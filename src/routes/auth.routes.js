console.log("🔵 AUTH ROUTES FILE LOADED");

import express from 'express';
import { login, createUser } from '../controllers/auth.controller.js';
import { authRequired } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roles.js';

const router = express.Router();

console.log("🔵 Creating auth router...");

// Public routes (no /auth prefix - it's already in server.js)
router.post('/login', login);
console.log("🔵 POST /login registered");

// Protected routes - SUPER_ADMIN only
router.post('/create-user', authRequired, requireSuperAdmin, createUser);
console.log("🔵 POST /create-user registered");

console.log("🔵 AUTH ROUTES EXPORT READY");

export default router;
