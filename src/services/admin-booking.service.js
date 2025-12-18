import prisma from '../config/prisma.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';

// UUID validation helper
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Get all bookings (Admin view)
 */
export const getAllBookings = async () => {
  console.log('📋 ADMIN FETCH BOOKINGS');

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      glampName: true,
      customerName: true,
      guests: true,
      status: true,
      createdAt: true,
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return bookings;
};

/**
 * Get booking by ID (Admin view)
 */
export const getBookingById = async (bookingId) => {
  if (!isValidUUID(bookingId)) {
    throw new ValidationError('Invalid booking ID format');
  }

  console.log('📋 ADMIN FETCH BOOKING DETAIL:', bookingId);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      glampName: true,
      customerName: true,
      guests: true,
      checkInDate: true,
      checkOutDate: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      agent: {
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
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  return booking;
};

/**
 * Update booking status with validation
 */
export const updateBookingStatus = async (bookingId, newStatus) => {
  if (!isValidUUID(bookingId)) {
    throw new ValidationError('Invalid booking ID format');
  }

  // Validate status
  const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
  if (!validStatuses.includes(newStatus)) {
    throw new ValidationError('Invalid status. Must be PENDING, CONFIRMED, CANCELLED, or COMPLETED');
  }

  console.log('🔄 ADMIN UPDATE STATUS:', bookingId, '→', newStatus);

  // Get current booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Validate status transitions
  const currentStatus = booking.status;
  
  if (currentStatus === 'PENDING') {
    if (!['CONFIRMED', 'CANCELLED'].includes(newStatus)) {
      throw new ValidationError('PENDING bookings can only be changed to CONFIRMED or CANCELLED');
    }
  } else if (currentStatus === 'CONFIRMED') {
    if (!['COMPLETED', 'CANCELLED'].includes(newStatus)) {
      throw new ValidationError('CONFIRMED bookings can only be changed to COMPLETED or CANCELLED');
    }
  } else if (currentStatus === 'CANCELLED' || currentStatus === 'COMPLETED') {
    throw new ValidationError(`Cannot change status of ${currentStatus} bookings`);
  }

  // Update booking
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: newStatus },
    select: {
      id: true,
      glampName: true,
      customerName: true,
      guests: true,
      status: true,
      checkInDate: true,
      checkOutDate: true,
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedBooking;
};

/**
 * Assign agent to booking
 */
export const assignAgent = async (bookingId, agentId) => {
  if (!isValidUUID(bookingId)) {
    throw new ValidationError('Invalid booking ID format');
  }

  if (!isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent ID format');
  }

  console.log('👤 ADMIN ASSIGN AGENT:', bookingId, '→ Agent:', agentId);

  // Verify booking exists
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Verify agent exists and has AGENT role
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { id: true, role: true, name: true, active: true },
  });

  if (!agent) {
    throw new NotFoundError('Agent');
  }

  if (agent.role !== 'AGENT') {
    throw new ValidationError('User must have AGENT role');
  }

  if (!agent.active) {
    throw new ValidationError('Agent account is inactive');
  }

  // Assign agent to booking
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { agentId },
    select: {
      id: true,
      glampName: true,
      customerName: true,
      guests: true,
      status: true,
      checkInDate: true,
      checkOutDate: true,
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedBooking;
};
