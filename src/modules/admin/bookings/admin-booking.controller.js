/**
 * Admin Booking Creation Controller
 */

import * as adminBookingService from './admin-booking.service.js';
import { asyncHandler } from '../../../utils/errors.js';

/**
 * Create a new booking (Admin version)
 * @route POST /api/admin/bookings
 * @access ADMIN, SUPER_ADMIN
 * 
 * Request body:
 * {
 *   glampId: string,
 *   checkInDate: string (ISO),
 *   checkOutDate: string (ISO),
 *   adults: number,
 *   children: number,
 *   guest: {
 *     fullName: string,
 *     email: string,
 *     phone?: string,
 *     specialRequests?: string
 *   },
 *   addOns?: [{ code, name, priceCents, qty }],
 *   paymentStatus?: "PENDING"|"PARTIAL"|"PAID"
 * }
 */
export const createBooking = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] Admin booking controller - request body:', JSON.stringify(req.body, null, 2));
  }
  console.log('[ADMIN BOOKING CONTROLLER] Creating booking');

  let booking;
  try {
    booking = await adminBookingService.createAdminBooking(req.body);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Booking created, returning response:', { bookingId: booking.id });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DEBUG] Error in createAdminBooking service:', error);
    }
    throw error; // Re-throw to let asyncHandler handle it
  }

  return res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});
