/**
 * Admin Staff Management Controller
 * Handles HTTP requests for staff member creation and management
 */

import * as adminStaffService from './admin-staff.service.js';
import { asyncHandler } from '../../../utils/errors.js';

/**
 * Create a new staff member (User with ADMIN role)
 * @route POST /api/admin/staff
 * @access ADMIN, SUPER_ADMIN
 * 
 * Request body:
 * {
 *   fullName: string,
 *   email: string,
 *   phone?: string,
 *   role: "ADMIN" | "SUPER_ADMIN",
 *   password?: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: string,
 *   data: {
 *     user: { id, name, email, role, active, createdAt },
 *     tempPassword?: string (only if auto-generated)
 *   }
 * }
 */
export const createStaff = asyncHandler(async (req, res) => {
  console.log('[ADMIN STAFF CONTROLLER] Creating staff member');
  
  const result = await adminStaffService.createStaffMember(req.body);

  const message = result.tempPassword
    ? 'Staff member created successfully. Temporary password generated.'
    : 'Staff member created successfully.';

  return res.status(201).json({
    success: true,
    message,
    data: result,
  });
});
