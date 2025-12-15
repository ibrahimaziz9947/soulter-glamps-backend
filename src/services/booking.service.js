import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { createCommissionForBooking } from './commission.service.js';

/**
 * Create a new booking (public - no login required)
 */
export const createBooking = async (bookingData, userId = null) => {
  // Support both checkIn/checkOut and checkInDate/checkOutDate field names
  const { 
    customerName, 
    customerPhone, 
    customerEmail, 
    checkIn: checkInField,
    checkInDate,
    nights, 
    glampId, 
    totalAmount, 
    paidAmount,
    agentId // Optional: agent who referred this booking
  } = bookingData;

  // Use checkInDate if provided, otherwise fall back to checkIn
  const checkInValue = checkInDate || checkInField;

  // Validate required fields
  if (!checkInValue) {
    throw new ValidationError('Check-in date is required');
  }

  if (!nights || nights < 1) {
    throw new ValidationError('Number of nights must be at least 1');
  }

  // Validate and parse check-in date
  const checkInDate_parsed = new Date(checkInValue);
  if (isNaN(checkInDate_parsed.getTime())) {
    throw new ValidationError('Invalid check-in date format');
  }

  // Calculate check-out date
  const checkOutDate_parsed = new Date(checkInDate_parsed);
  checkOutDate_parsed.setDate(checkOutDate_parsed.getDate() + parseInt(nights));

  // Validate dates are in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (checkInDate_parsed < today) {
    throw new ValidationError('Check-in date must be today or in the future');
  }

  // Check if glamp exists and is active
  const glamp = await prisma.glamp.findUnique({
    where: { id: glampId },
  });

  if (!glamp) {
    throw new NotFoundError('Glamp');
  }

  if (glamp.status !== 'ACTIVE') {
    throw new ValidationError('This glamp is not available for booking');
  }

  // Check for overlapping bookings
  // Since we don't store checkOut, we need to fetch all active bookings and check manually
  const existingBookings = await prisma.booking.findMany({
    where: {
      glampId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: {
      id: true,
      checkIn: true,
      nights: true,
    },
  });

  // Check for date conflicts
  for (const existing of existingBookings) {
    const existingCheckOut = new Date(existing.checkIn);
    existingCheckOut.setDate(existingCheckOut.getDate() + existing.nights);

    // Overlap occurs if:
    // 1. New checkIn is before existing checkOut AND
    // 2. New checkOut is after existing checkIn
    const hasOverlap = 
      checkInDate_parsed < existingCheckOut && 
      checkOutDate_parsed > existing.checkIn;

    if (hasOverlap) {
      throw new ValidationError('This glamp is already booked for the selected dates');
    }
  }

  const booking = await prisma.booking.create({
    data: {
      customerName,
      customerPhone,
      customerEmail,
      checkIn: checkInDate_parsed,
      nights: parseInt(nights),
      totalAmount: parseFloat(totalAmount),
      paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
      glampId,
      createdById: userId,
      agentId: agentId ? parseInt(agentId) : null, // Link to agent if provided
      status: 'PENDING',
    },
    include: {
      glamp: {
        select: {
          id: true,
          name: true,
          basePrice: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return booking;
};

/**
 * Update booking status
 * @access ADMIN, SUPER_ADMIN
 */
export const updateBookingStatus = async (bookingId, status, userId) => {
  const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: {
      glamp: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Create commission when booking is CONFIRMED or COMPLETED
  if ((status === 'CONFIRMED' || status === 'COMPLETED') && updatedBooking.agentId) {
    try {
      await createCommissionForBooking(bookingId);
    } catch (error) {
      console.error('Error creating commission:', error);
      // Don't fail the booking update if commission creation fails
    }
  }

  return updatedBooking;
};

/**
 * Update booking details
 * @access ADMIN, SUPER_ADMIN
 */
export const updateBooking = async (bookingId, updates) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: updates,
    include: {
      glamp: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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

/**
 * Get booking by ID
 */
export const getBookingById = async (bookingId, user = null) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      glamp: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Agents can only view bookings they referred
  if (user && user.role === 'AGENT' && booking.agentId !== user.id) {
    throw new ForbiddenError('You can only view bookings you referred');
  }

  return booking;
};

/**
 * Get all bookings with pagination and filters
 * @access ADMIN, SUPER_ADMIN
 */
export const getAllBookings = async (filters = {}, pagination = {}) => {
  const { skip, take } = pagination;
  const { status, glampId, search, fromDate, toDate } = filters;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (glampId) {
    where.glampId = parseInt(glampId);
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (fromDate) {
    where.checkIn = { ...where.checkIn, gte: new Date(fromDate) };
  }

  if (toDate) {
    where.checkIn = { ...where.checkIn, lte: new Date(toDate) };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take,
      include: {
        glamp: {
          select: {
            id: true,
            name: true,
            basePrice: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total };
};

/**
 * Get agent's bookings (bookings they referred)
 * @access AGENT
 */
export const getAgentBookings = async (agentId, filters = {}, pagination = {}) => {
  const { skip, take } = pagination;
  const { status } = filters;

  const where = { agentId: agentId }; // Changed from createdById to agentId

  if (status) {
    where.status = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take,
      include: {
        glamp: {
          select: {
            id: true,
            name: true,
            basePrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total };
};
