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
  console.log('[ADMIN BOOKING CONTROLLER] Creating booking');

  const booking = await adminBookingService.createAdminBooking(req.body);

  return res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});
