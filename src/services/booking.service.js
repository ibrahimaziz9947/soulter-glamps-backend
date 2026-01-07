import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { createCommissionForBooking } from './commission.service.js';
import { hashPassword } from '../utils/hash.js';

/**
 * Validate UUID format
 */
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Find or create a CUSTOMER user
 */
const findOrCreateCustomer = async (name, email) => {
  // Check if customer already exists
  let customer = await prisma.user.findUnique({
    where: { email },
  });

  if (customer) {
    // If exists but not a customer, throw error
    if (customer.role !== 'CUSTOMER') {
      throw new ValidationError('This email is already registered with a different role');
    }
    return customer;
  }

  // Create new CUSTOMER user (no password needed - business entity)
  const tempPassword = await hashPassword('customer-temp-' + Date.now());
  customer = await prisma.user.create({
    data: {
      name,
      email,
      password: tempPassword, // Required field but not used for CUSTOMER login
      role: 'CUSTOMER',
      active: true,
    },
  });

  return customer;
};

/**
 * Create a new booking (public - no login required)
 */
export const createBooking = async (bookingData) => {
  const { 
    customerName, 
    customerEmail,
    customerPhone, // Optional phone number
    glampId, 
    checkInDate,
    checkOutDate,
    numberOfGuests, // Accept both formats
    guests, // Frontend may send 'guests' instead
    agentId // Optional: agent who referred this booking
  } = bookingData;

  // Support both 'guests' and 'numberOfGuests'
  const guestCount = guests || numberOfGuests;

  // Validate required fields
  if (!customerName || !customerEmail) {
    throw new ValidationError('Please provide your name and email address');
  }

  if (!glampId) {
    throw new ValidationError('Please select a glamp to book');
  }

  if (!checkInDate || !checkOutDate) {
    throw new ValidationError('Please select check-in and check-out dates');
  }

  // Validate UUID format
  if (!isValidUUID(glampId)) {
    throw new ValidationError('Invalid glamp selection. Please try again');
  }

  if (agentId && !isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent reference');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerEmail)) {
    throw new ValidationError('Please provide a valid email address');
  }

  // Parse and validate dates
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new ValidationError('Please provide valid dates for your booking');
  }

  // Validate date range
  if (checkOut <= checkIn) {
    throw new ValidationError('Check-out date must be after check-in date');
  }

  // Validate dates are in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (checkIn < today) {
    throw new ValidationError('Check-in date cannot be in the past');
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
    throw new NotFoundError('The selected glamp is no longer available');
  }

  if (glamp.status !== 'ACTIVE') {
    throw new ValidationError('This glamp is currently unavailable for booking. Please choose another one');
  }

  // Validate number of guests
  if (guestCount && guestCount > glamp.maxGuests) {
    throw new ValidationError(`This glamp can accommodate a maximum of ${glamp.maxGuests} guest${glamp.maxGuests > 1 ? 's' : ''}. Please reduce the number of guests or choose a larger glamp`);
  }

  // Calculate total amount
  const totalAmount = glamp.pricePerNight * nights;

  // Find or create customer
  const customer = await findOrCreateCustomer(customerName, customerEmail);

  // Verify agent exists if provided
  if (agentId) {
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.role !== 'AGENT') {
      throw new ValidationError('Invalid agent ID');
    }
  }

  // Log booking creation attempt
  console.log('📝 Creating booking:', {
    glampId,
    glampName: glamp.name,
    customerEmail,
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    nights,
    totalAmount: `$${totalAmount / 100}`,
  });

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      customerId: customer.id,
      customerName: customer.name, // Snapshot field
      agentId: agentId || null,
      glampId,
      glampName: glamp.name, // Snapshot field
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests: guestCount || 1, // Store guest count
      totalAmount,
      status: 'PENDING',
    },
    include: {
      customer: {
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
      glamp: {
        select: {
          id: true,
          name: true,
          pricePerNight: true,
        },
      },
    },
  });

  // Log successful booking creation
  console.log('✅ Booking created successfully:', {
    bookingId: booking.id,
    customer: booking.customer.email,
    glamp: booking.glamp.name,
    status: booking.status,
  });

  return booking;
};

/**
 * Get all bookings with role-based filtering
 */
export const getAllBookings = async (user) => {
  console.log('📋 [BOOKING SERVICE] getAllBookings() called');
  console.log('📋 [BOOKING SERVICE] User role:', user.role);
  console.log('📋 [BOOKING SERVICE] FILE: booking.service.js');

  const where = {};

  // Role-based filtering
  if (user.role === 'CUSTOMER') {
    where.customerId = user.id;
  } else if (user.role === 'AGENT') {
    where.agentId = user.id;
  }
  // ADMIN and SUPER_ADMIN see all bookings (no filter)

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      customer: {
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
      glamp: {
        select: {
          id: true,
          name: true,
          pricePerNight: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('✅ [BOOKING SERVICE] Bookings fetched:', bookings.length);
  if (bookings.length > 0) {
    console.log('📊 [BOOKING SERVICE] First booking glamp:', bookings[0].glamp);
    console.log('🏕️ [ADMIN DASHBOARD] Recent booking glamp:', bookings[0].glamp);
  }

  return bookings;
};

/**
 * Get booking by ID with role-based access control
 */
export const getBookingById = async (bookingId) => {
  if (!isValidUUID(bookingId)) {
    throw new ValidationError('Invalid booking ID format');
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      checkInDate: true,
      checkOutDate: true,
      guests: true,
      glampName: true,
      customerName: true,
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // ADMIN and SUPER_ADMIN can view any booking

  return booking;
};

/**
 * Update booking status with validation
 */
export const updateBookingStatus = async (bookingId, newStatus, userId) => {
  if (!isValidUUID(bookingId)) {
    throw new ValidationError('Invalid booking ID format');
  }

  // Validate status
  const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
  if (!validStatuses.includes(newStatus)) {
    throw new ValidationError('Invalid booking status');
  }

  // Get current booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      agent: true,
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Validate status transitions
  const currentStatus = booking.status;
  const allowedTransitions = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['CANCELLED', 'COMPLETED'],
    CANCELLED: [], // Cannot change from CANCELLED
    COMPLETED: [], // Cannot change from COMPLETED
  };

  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: newStatus },
    include: {
      customer: {
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
      glamp: {
        select: {
          id: true,
          name: true,
          pricePerNight: true,
        },
      },
    },
  });

  // Create commission if status changed to CONFIRMED or COMPLETED and agent is involved
  if ((newStatus === 'CONFIRMED' || newStatus === 'COMPLETED') && booking.agentId) {
    try {
      await createCommissionForBooking(bookingId);
    } catch (error) {
      console.error('Error creating commission:', error);
      // Don't fail the booking status update if commission creation fails
    }
  }

  return updatedBooking;
};
