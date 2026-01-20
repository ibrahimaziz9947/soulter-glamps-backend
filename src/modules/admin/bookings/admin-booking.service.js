/**
 * Admin Booking Creation Service
 * Enhanced booking creation with admin-specific features
 */

import prisma from '../../../config/prisma.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { hashPassword } from '../../../utils/hash.js';

/**
 * Validate UUID format
 */
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Find or create a CUSTOMER user
 * @deprecated - Now using upsert directly in createAdminBooking for better atomicity
 * Kept for reference
 */
const findOrCreateCustomer = async (fullName, email, phone) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] findOrCreateCustomer called with:', { fullName, email, phone });
  }

  // Check if customer already exists
  let customer = await prisma.user.findUnique({
    where: { email },
  });

  if (customer) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Found existing customer:', { id: customer.id, email: customer.email, role: customer.role });
    }
    // If exists but not a customer, throw error
    if (customer.role !== 'CUSTOMER') {
      throw new ValidationError('This email is already registered with a different role');
    }
    return customer;
  }

  // Create new CUSTOMER user
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] Creating new customer user');
  }
  const tempPassword = await hashPassword('customer-temp-' + Date.now());
  customer = await prisma.user.create({
    data: {
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password: tempPassword,
      role: 'CUSTOMER',
      active: true,
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] Customer created successfully:', { id: customer.id, email: customer.email });
  }

  return customer;
};

/**
 * Check for overlapping bookings
 */
const checkOverlappingBookings = async (glampId, checkInDate, checkOutDate, excludeBookingId = null) => {
  const where = {
    glampId,
    status: { in: ['CONFIRMED', 'COMPLETED'] },
    AND: [
      { checkInDate: { lt: checkOutDate } },
      { checkOutDate: { gt: checkInDate } },
    ],
  };

  if (excludeBookingId) {
    where.id = { not: excludeBookingId };
  }

  const overlappingBooking = await prisma.booking.findFirst({
    where,
    select: {
      id: true,
      checkInDate: true,
      checkOutDate: true,
      customerName: true,
    },
  });

  return overlappingBooking;
};

/**
 * Create a new booking (Admin version with enhanced validation)
 * @param {Object} bookingData - Booking data
 * @param {string} bookingData.glampId - Glamp ID
 * @param {string} bookingData.checkInDate - Check-in date (ISO string)
 * @param {string} bookingData.checkOutDate - Check-out date (ISO string)
 * @param {number} [bookingData.adults] - Number of adults
 * @param {number} [bookingData.children] - Number of children
 * @param {Object} bookingData.guest - Guest information
 * @param {string} bookingData.guest.fullName - Guest full name
 * @param {string} bookingData.guest.email - Guest email
 * @param {string} [bookingData.guest.phone] - Guest phone
 * @param {string} [bookingData.guest.specialRequests] - Special requests
 * @param {Array} [bookingData.addOns] - Add-ons (for future use)
 * @param {string} [bookingData.paymentStatus] - Payment status
 * @returns {Promise<Object>} Created booking with totals
 */
export const createAdminBooking = async (bookingData) => {
  const {
    glampId,
    checkInDate,
    checkOutDate,
    adults = 1,
    children = 0,
    guest,
    addOns = [],
    paymentStatus = 'PENDING',
  } = bookingData;

  // Validate required fields
  if (!glampId) {
    throw new ValidationError('Glamp ID is required');
  }

  if (!checkInDate || !checkOutDate) {
    throw new ValidationError('Check-in and check-out dates are required');
  }

  if (!guest || !guest.fullName || !guest.email) {
    throw new ValidationError('Guest name and email are required');
  }

  // Validate UUID format
  if (!isValidUUID(glampId)) {
    throw new ValidationError('Invalid glamp ID format');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guest.email)) {
    throw new ValidationError('Invalid email address format');
  }

  // Parse and validate dates
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new ValidationError('Invalid date format');
  }

  // Validate date range
  if (checkOut <= checkIn) {
    throw new ValidationError('Check-out date must be after check-in date');
  }

  // Calculate number of nights
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  if (nights < 1) {
    throw new ValidationError('Booking must be at least 1 night');
  }

  // Check if glamp exists and is active
  const glamp = await prisma.glamp.findUnique({
    where: { id: glampId },
  });

  if (!glamp) {
    throw new NotFoundError('Glamp');
  }

  if (glamp.status !== 'ACTIVE') {
    throw new ValidationError('This glamp is currently not available for booking');
  }

  // Total guests
  const totalGuests = adults + children;

  // Validate number of guests
  if (totalGuests > glamp.maxGuests) {
    throw new ValidationError(`This glamp can accommodate a maximum of ${glamp.maxGuests} guests`);
  }

  // Check for overlapping CONFIRMED/COMPLETED bookings
  const overlapping = await checkOverlappingBookings(glampId, checkIn, checkOut);
  if (overlapping) {
    throw new ValidationError(
      `This glamp is already booked from ${overlapping.checkInDate.toISOString().split('T')[0]} to ${overlapping.checkOutDate.toISOString().split('T')[0]}`
    );
  }

  // Calculate total amount in cents
  // Base price: nights * pricePerNight
  let totalAmountCents = glamp.pricePerNight * nights;

  // Add-ons total (for future use)
  const addOnsTotal = addOns.reduce((sum, addon) => {
    return sum + (addon.priceCents || 0) * (addon.qty || 1);
  }, 0);

  totalAmountCents += addOnsTotal;

  // Find or create customer - use Prisma upsert for atomicity
  // This prevents race conditions where duplicate emails could cause failures
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] Looking up/creating customer:', { fullName: guest.fullName, email: guest.email });
  }

  const tempPassword = await hashPassword('customer-temp-' + Date.now());
  
  let customer;
  try {
    customer = await prisma.user.upsert({
      where: { email: guest.email.trim().toLowerCase() },
      update: {
        // If customer exists, optionally update name/phone if they changed
        // For now, we keep the existing customer record as-is
        // This preserves the original customer name in their profile
      },
      create: {
        name: guest.fullName.trim(),
        email: guest.email.trim().toLowerCase(),
        password: tempPassword,
        role: 'CUSTOMER',
        active: true,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Customer resolved:', {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        role: customer.role
      });
    }

    // Verify this is a CUSTOMER role
    if (customer.role !== 'CUSTOMER') {
      throw new ValidationError('This email is already registered with a different role (admin/agent). Please use a different email for the guest.');
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DEBUG] Error in customer upsert:', error);
    }
    throw error;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] About to create booking with data:', {
      customerId: customer.id,
      customerName: guest.fullName, // Use the name provided in the booking form, not DB customer name
      glampId,
      glampName: glamp.name,
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
      guests: totalGuests,
      totalAmount: totalAmountCents,
      status: paymentStatus === 'PAID' ? 'CONFIRMED' : 'PENDING',
    });
  }

  console.log('[ADMIN BOOKING] Creating booking:', {
    glampId,
    glampName: glamp.name,
    customerEmail: customer.email,
    guestName: guest.fullName,
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    nights,
    totalGuests,
    totalAmountCents,
  });

  // Create booking with explicit error handling
  // NOTE: We use the guest name from the form (not DB customer name)
  // because the booking should reflect who is actually staying
  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        customerId: customer.id,
        customerName: guest.fullName.trim(), // Use name from booking form
        glampId,
        glampName: glamp.name,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guests: totalGuests,
        totalAmount: totalAmountCents,
        status: paymentStatus === 'PAID' ? 'CONFIRMED' : 'PENDING',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        glamp: {
          select: {
            id: true,
            name: true,
            pricePerNight: true,
          },
        },
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] ✅ Booking created successfully in DB:', {
        id: booking.id,
        status: booking.status,
        customerId: booking.customerId,
        customerName: booking.customerName,
        createdAt: booking.createdAt,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[ADMIN BOOKING] ✅ Booking created successfully:', booking.id);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DEBUG] ❌ Error creating booking in database:', error);
      console.error('[DEBUG] Error details:', {
        code: error.code,
        meta: error.meta,
        message: error.message
      });
    }
    throw error;
  }

  // Return booking with computed totals
  return {
    id: booking.id,
    status: booking.status,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    nights,
    guests: {
      adults,
      children,
      total: totalGuests,
    },
    totals: {
      baseAmountCents: glamp.pricePerNight * nights,
      addOnsAmountCents: addOnsTotal,
      totalAmountCents,
    },
    glamp: {
      id: booking.glamp.id,
      name: booking.glamp.name,
      pricePerNightCents: booking.glamp.pricePerNight,
    },
    customer: {
      id: booking.customer.id,
      name: booking.customer.name,
      email: booking.customer.email,
    },
  };
};
