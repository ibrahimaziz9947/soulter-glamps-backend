import * as adminBookingService from '../services/admin-booking.service.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * Get all bookings (Admin view)
 * @route GET /api/admin/bookings
 * @access ADMIN, SUPER_ADMIN
 */
export const getAllBookings = asyncHandler(async (req, res) => {
  console.log('🎯 CONTROLLER: admin-booking.controller.getAllBookings() called');
  console.log('🎯 ROUTE: GET /api/admin/bookings');
  
  const bookings = await adminBookingService.getAllBookings();

  console.log('📤 CONTROLLER: Returning', bookings.length, 'bookings');
  
  return res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings,
  });
});

/**
 * Get booking by ID (Admin view)
 * @route GET /api/admin/bookings/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await adminBookingService.getBookingById(id);

  return res.status(200).json({
    success: true,
    data: booking,
  });
});

/**
 * Update booking status
 * @route PATCH /api/admin/bookings/:id/status
 * @access ADMIN, SUPER_ADMIN
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: 'Status is required',
    });
  }

  const booking = await adminBookingService.updateBookingStatus(id, status);

  return res.status(200).json({
    success: true,
    message: 'Booking status updated successfully',
    data: booking,
  });
});

/**
 * Assign agent to booking
 * @route PATCH /api/admin/bookings/:id/assign-agent
 * @access ADMIN, SUPER_ADMIN
 */
export const assignAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;

  if (!agentId) {
    return res.status(400).json({
      success: false,
      error: 'Agent ID is required',
    });
  }

  const booking = await adminBookingService.assignAgent(id, agentId);

  return res.status(200).json({
    success: true,
    message: 'Agent assigned successfully',
    data: booking,
  });
});
