import * as bookingService from '../services/booking.service.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * Create a new booking
 * @route POST /api/bookings
 * @access Public (customers can book without login)
 */
export const createBooking = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const booking = await bookingService.createBooking(req.body, userId);

  return res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});

/**
 * Update booking status
 * @route PATCH /api/bookings/:id/status
 * @access ADMIN, SUPER_ADMIN
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const booking = await bookingService.updateBookingStatus(parseInt(id), status, req.user.id);

  return res.status(200).json({
    success: true,
    message: 'Booking status updated successfully',
    data: booking,
  });
});

/**
 * Update booking details
 * @route PUT /api/bookings/:id
 * @access ADMIN, SUPER_ADMIN
 */
export const updateBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await bookingService.updateBooking(parseInt(id), req.body);

  return res.status(200).json({
    success: true,
    message: 'Booking updated successfully',
    data: booking,
  });
});

/**
 * Get booking by ID
 * @route GET /api/bookings/:id
 * @access Public (with restrictions for AGENT role)
 */
export const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await bookingService.getBookingById(parseInt(id), req.user);

  return res.status(200).json({
    success: true,
    data: booking,
  });
});

/**
 * Get all bookings
 * @route GET /api/bookings
 * @access ADMIN, SUPER_ADMIN
 */
export const getAllBookings = asyncHandler(async (req, res) => {
  const { page, limit, status, glampId, search, fromDate, toDate } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { status, glampId, search, fromDate, toDate };

  const { bookings, total } = await bookingService.getAllBookings(filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: bookings,
    pagination: meta,
  });
});

/**
 * Get agent's bookings
 * @route GET /api/bookings/my-bookings
 * @access AGENT
 */
export const getAgentBookings = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { status };

  const { bookings, total } = await bookingService.getAgentBookings(req.user.id, filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: bookings,
    pagination: meta,
  });
});
