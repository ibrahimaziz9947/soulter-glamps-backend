import * as staffService from '../services/staff.service.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * Create a new staff member
 * @route POST /api/staff
 * @access SUPER_ADMIN
 */
export const createStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.createStaff(req.body, req.user.id);

  return res.status(201).json({
    success: true,
    message: 'Staff member created successfully',
    data: staff,
  });
});

/**
 * Update staff member
 * @route PUT /api/staff/:id
 * @access SUPER_ADMIN
 */
export const updateStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const staff = await staffService.updateStaff(parseInt(id), req.body);

  return res.status(200).json({
    success: true,
    message: 'Staff member updated successfully',
    data: staff,
  });
});

/**
 * Delete staff member
 * @route DELETE /api/staff/:id
 * @access SUPER_ADMIN
 */
export const deleteStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await staffService.deleteStaff(parseInt(id));

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Get all staff members
 * @route GET /api/staff
 * @access SUPER_ADMIN, ADMIN
 */
export const getAllStaff = asyncHandler(async (req, res) => {
  const { page, limit, role, search } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { role, search };

  const { staff, total } = await staffService.getAllStaff(filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: staff,
    pagination: meta,
  });
});

/**
 * Get staff member by ID
 * @route GET /api/staff/:id
 * @access SUPER_ADMIN, ADMIN
 */
export const getStaffById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const staff = await staffService.getStaffById(parseInt(id));

  return res.status(200).json({
    success: true,
    data: staff,
  });
});
