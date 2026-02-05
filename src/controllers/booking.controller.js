import * as bookingService from '../services/booking.service.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * Create a new booking
 * @route POST /api/bookings
 * @access Public (no auth required)
 */
export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.body);

  return res.status(200).json({
    success: true,
    message: 'Booking created',
    booking: {
      id: booking.id,
      status: booking.status,
      totalAmount: booking.totalAmount,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      glamp: {
        name: booking.glamp.name,
      },
      customer: {
        name: booking.customer.name,
        email: booking.customer.email,
      },
    },
  });
});

/**
 * Get all bookings (role-based filtering)
 * @route GET /api/bookings
 * @access Auth required
 */
export const getAllBookings = asyncHandler(async (req, res) => {
  console.log('🎯 [BOOKING CONTROLLER] getAllBookings() called');
  console.log('🎯 [BOOKING CONTROLLER] Route: GET /api/bookings');
  console.log('🎯 [BOOKING CONTROLLER] User:', req.user?.role);

  const bookings = await bookingService.getAllBookings(req.user);

  console.log('📤 [BOOKING CONTROLLER] Returning', bookings.length, 'bookings');

  return res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings,
  });
});

/**
 * Get booking by ID
 * @route GET /api/bookings/:id
 * @access Public (no auth required)
 */
export const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await bookingService.getBookingById(id);

  return res.status(200).json({
    success: true,
    booking: {
      id: booking.id,
      status: booking.status,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      guests: booking.guests,
      glampName: booking.glampName,
      customerName: booking.customerName,
    },
  });
});

/**
 * Update booking status
 * @route PATCH /api/bookings/:id/status
 * @access ADMIN, AGENT
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const booking = await bookingService.updateBookingStatus(id, status, req.user.id);

  return res.status(200).json({
    success: true,
    message: 'Booking status updated successfully',
    data: booking,
  });
});

/**
 * Check availability for a glamp
 * 
 * Date Semantics:
 * - checkIn: Guest arrival date (inclusive)
 * - checkOut: Guest departure date (exclusive)
 * - Both dates normalized to start-of-day UTC for consistent comparisons
 * 
 * Response Format:
 * {
 *   success: true,
 *   data: {
 *     available: boolean,
 *     conflictingCount: number,
 *     conflicts: [{ bookingId, checkIn, checkOut, status }],
 *     queriedRange: { checkIn, checkOut, nights }
 *   }
 * }
 * 
 * @route GET /api/bookings/availability
 * @access Public (authenticated users: admin, agent, customer)
 */
export const checkAvailability = asyncHandler(async (req, res) => {
  const { glampId, glampIds, checkIn, checkOut } = req.query;

  // Resolve glamp IDs from various query formats
  let targetGlampIds = [];
  if (glampIds) {
    if (Array.isArray(glampIds)) {
      targetGlampIds = glampIds;
    } else if (typeof glampIds === 'string') {
      // Support comma-separated list
      targetGlampIds = glampIds.split(',').map(id => id.trim());
    }
  } else if (glampId) {
    targetGlampIds = [glampId];
  }

  // Validate required parameters
  if (targetGlampIds.length === 0 || !checkIn || !checkOut) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: glampId (or glampIds), checkIn, and checkOut are required',
    });
  }

  // Parse dates (will be normalized to start-of-day in service layer)
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  // Validate date format
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date format. Please use YYYY-MM-DD format',
    });
  }

  // Call service to check availability
  const availabilityData = await bookingService.checkAvailability(
    targetGlampIds,
    checkInDate,
    checkOutDate
  );

  return res.status(200).json({
    success: true,
    data: availabilityData,
  });
});

export const checkAvailabilityPost = asyncHandler(async (req, res) => {
  const { glampId, glampIds, checkIn, checkOut } = req.body || {};
  let targetGlampIds = [];
  if (Array.isArray(glampIds) && glampIds.length > 0) {
    targetGlampIds = glampIds;
  } else if (glampId) {
    targetGlampIds = [glampId];
  }
  if (targetGlampIds.length === 0 || !checkIn || !checkOut) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: glampId (or glampIds), checkIn, and checkOut are required',
    });
  }
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date format. Please use YYYY-MM-DD format',
    });
  }
  const result = await bookingService.checkAvailability(targetGlampIds, checkInDate, checkOutDate);
  const conflicts = result.available ? [] : Array.from(new Set(result.conflicts.flatMap(c => c.involvedGlamps.map(g => g.name || g.id))));
  return res.status(200).json({
    success: true,
    available: result.available,
    conflicts,
  });
});
