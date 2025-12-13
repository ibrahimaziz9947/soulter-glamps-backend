import * as glampService from '../services/glamp.service.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * Create a new glamp
 * @route POST /api/glamps
 * @access ADMIN, SUPER_ADMIN
 */
export const createGlamp = asyncHandler(async (req, res) => {
  const glamp = await glampService.createGlamp(req.body, req.user.id);

  return res.status(201).json({
    success: true,
    message: 'Glamp created successfully',
    data: glamp,
  });
});

/**
 * Update a glamp
 * @route PUT /api/glamps/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const updateGlamp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const glamp = await glampService.updateGlamp(parseInt(id), req.body);

  return res.status(200).json({
    success: true,
    message: 'Glamp updated successfully',
    data: glamp,
  });
});

/**
 * Delete a glamp
 * @route DELETE /api/glamps/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const deleteGlamp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await glampService.deleteGlamp(parseInt(id));

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Get glamp by ID
 * @route GET /api/glamps/:id
 * @access Public
 */
export const getGlampById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const glamp = await glampService.getGlampById(parseInt(id));

  return res.status(200).json({
    success: true,
    data: glamp,
  });
});

/**
 * Get all glamps
 * @route GET /api/glamps
 * @access Public
 */
export const getAllGlamps = asyncHandler(async (req, res) => {
  const { page, limit, status, minCapacity, maxPrice, search } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { status, minCapacity, maxPrice, search };

  const { glamps, total } = await glampService.getAllGlamps(filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: glamps,
    pagination: meta,
  });
});
