import * as glampService from '../services/glamp.service.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * Create a new glamp
 * @route POST /api/glamps
 * @access ADMIN, SUPER_ADMIN
 */
export const createGlamp = asyncHandler(async (req, res) => {
  const glamp = await glampService.createGlamp(req.body);

  return res.status(201).json({
    success: true,
    message: 'Glamp created successfully',
    data: glamp,
  });
});

/**
 * Get all glamps
 * @route GET /api/glamps
 * @access Public
 */
export const getAllGlamps = asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  const filters = { status };
  const glamps = await glampService.getAllGlamps(filters);

  return res.status(200).json({
    success: true,
    count: glamps.length,
    data: glamps,
  });
});

/**
 * Get glamp by ID
 * @route GET /api/glamps/:id
 * @access Public
 */
export const getGlampById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const glamp = await glampService.getGlampById(id);

  return res.status(200).json({
    success: true,
    data: glamp,
  });
});

/**
 * Update glamp
 * @route PUT /api/glamps/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const updateGlamp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const glamp = await glampService.updateGlamp(id, req.body);

  return res.status(200).json({
    success: true,
    message: 'Glamp updated successfully',
    data: glamp,
  });
});

/**
 * Delete glamp
 * @route DELETE /api/glamps/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const deleteGlamp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await glampService.deleteGlamp(id);

  return res.status(200).json({
    success: true,
    message: `Glamp deleted successfully. ${result.deletedBookings} related booking(s) removed.`,
    data: result,
  });
});
