import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/roles.js';
import * as staffController from '../controllers/staff.controller.js';

const router = express.Router();

// Protected routes - ADMIN can view staff
router.get('/staff', authRequired, requireAdmin, staffController.getAllStaff);
router.get('/staff/:id', authRequired, requireAdmin, staffController.getStaffById);

// Protected routes - SUPER_ADMIN only for modifications
router.post('/staff', authRequired, requireSuperAdmin, staffController.createStaff);
router.put('/staff/:id', authRequired, requireSuperAdmin, staffController.updateStaff);
router.delete('/staff/:id', authRequired, requireSuperAdmin, staffController.deleteStaff);

export default router;
