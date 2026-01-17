/**
 * Admin Staff Management Routes
 * Provides endpoints for staff member creation and management
 */

import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as adminStaffController from './admin-staff.controller.js';

const router = express.Router();

/**
 * @route POST /api/admin/staff
 * @desc Create a new staff member (User with ADMIN role)
 * @access ADMIN, SUPER_ADMIN
 */
router.post('/', authRequired, requireAdmin, adminStaffController.createStaff);

export default router;
