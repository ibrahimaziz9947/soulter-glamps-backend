import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError, BookingConflictError } from '../utils/errors.js';
import { createCommissionForBooking } from './commission.service.js';
import { postBookingToFinance } from './financeIntegration.service.js';
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
  // If email is provided, check if customer already exists
  if (email) {
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
  }

  // Create new CUSTOMER user (no password needed - business entity)
  const tempPassword = await hashPassword('customer-temp-' + Date.now());
  const customer = await prisma.user.create({
    data: {
      name,
      email: email || null, // Allow null email
      password: tempPassword, // Required field but not used for CUSTOMER login
      role: 'CUSTOMER',
      active: true,
    },
  });

  return customer;
};

/**
 * Check availability for glamp(s) in a given date range
 * Supports single glamp ID or array of glamp IDs
 * 
 * Date Semantics:
 * - checkIn: Guest arrives on this date (inclusive, start-of-day)
 * - checkOut: Guest leaves on this date (exclusive, start-of-day)
 * - Example: checkIn=2026-01-25, checkOut=2026-01-27 means 2 nights (25th and 26th)
 * 
 * Date Normalization:
 * - All dates normalized to start-of-day UTC (00:00:00.000Z)
 * - Ensures consistent overlap detection regardless of time components
 * 
 * Overlap Logic:
 * - Two bookings conflict if: (existing.checkIn < newCheckOut) AND (existing.checkOut > newCheckIn)
 * - Checks both primary glampId and booking items for multi-glamp bookings
 * 
 * @param {string|string[]} glampIdOrIds - Glamp ID or array of Glamp IDs to check
 * @param {Date} checkIn - Check-in date (will be normalized to start-of-day UTC)
 * @param {Date} checkOut - Check-out date (will be normalized to start-of-day UTC, exclusive)
 * @param {string} [excludeBookingId] - Optional: booking ID to exclude from conflict check (for updates)
 * @returns {Promise<{available: boolean, conflictingCount: number, conflicts: Array}>}
 */
export const checkAvailability = async (glampIdOrIds, checkIn, checkOut, excludeBookingId = null) => {
  // Normalize dates to start-of-day (UTC midnight) for consistent comparisons
  const normalizeToStartOfDay = (date) => {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  };

  // Handle single ID or array of IDs
  const glampIds = Array.isArray(glampIdOrIds) ? glampIdOrIds : [glampIdOrIds];

  // Validate inputs
  if (glampIds.length === 0) {
    throw new ValidationError('At least one glamp ID is required');
  }

  for (const id of glampIds) {
    if (!isValidUUID(id)) {
      throw new ValidationError(`Invalid glamp ID format: ${id}`);
    }
  }

  if (!(checkIn instanceof Date) || isNaN(checkIn.getTime())) {
    throw new ValidationError('Invalid check-in date');
  }

  if (!(checkOut instanceof Date) || isNaN(checkOut.getTime())) {
    throw new ValidationError('Invalid check-out date');
  }

  if (checkOut <= checkIn) {
    throw new ValidationError('Check-out date must be after check-in date (at least 1 night)');
  }

  // Normalize dates to start-of-day for consistent overlap detection
  const normalizedCheckIn = normalizeToStartOfDay(checkIn);
  const normalizedCheckOut = normalizeToStartOfDay(checkOut);

  // Verify glamps exist
  const glamps = await prisma.glamp.findMany({
    where: { id: { in: glampIds } },
    select: { id: true, name: true }
  });

  if (glamps.length !== glampIds.length) {
    throw new NotFoundError('One or more glamps not found');
  }

  // Find conflicting bookings
  // A booking conflicts if date ranges overlap AND (glampId matches OR items contain glampId)
  const where = {
    AND: [
      {
        OR: [
          { glampId: { in: glampIds } },
          { items: { some: { glampId: { in: glampIds } } } }
        ]
      },
      {
        status: {
          in: ['CONFIRMED', 'PENDING'], // Only count active bookings
        }
      },
      { checkInDate: { lt: normalizedCheckOut } },
      { checkOutDate: { gt: normalizedCheckIn } },
    ],
  };

  // Exclude a specific booking (useful for updates)
  if (excludeBookingId && isValidUUID(excludeBookingId)) {
    where.AND.push({ id: { not: excludeBookingId } });
  }

  const conflictingBookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      checkInDate: true,
      checkOutDate: true,
      status: true,
      glampId: true,
      glampName: true,
      items: {
        select: {
          glampId: true,
          glamp: { select: { name: true } }
        }
      }
    },
    orderBy: { checkInDate: 'asc' },
  });

  const available = conflictingBookings.length === 0;

  return {
    available,
    conflictingCount: conflictingBookings.length,
    conflicts: conflictingBookings.map(b => {
      // Determine which of the requested glamps are involved in this conflict
      const involvedGlamps = [];
      if (glampIds.includes(b.glampId)) involvedGlamps.push({ id: b.glampId, name: b.glampName });
      
      b.items.forEach(item => {
        if (glampIds.includes(item.glampId) && !involvedGlamps.find(g => g.id === item.glampId)) {
          involvedGlamps.push({ id: item.glampId, name: item.glamp.name });
        }
      });

      return {
        bookingId: b.id,
        checkIn: b.checkInDate.toISOString().split('T')[0], // YYYY-MM-DD format
        checkOut: b.checkOutDate.toISOString().split('T')[0], // YYYY-MM-DD format
        status: b.status,
        involvedGlamps
      };
    }),
    // Additional debugging info
    queriedRange: {
      checkIn: normalizedCheckIn.toISOString().split('T')[0],
      checkOut: normalizedCheckOut.toISOString().split('T')[0],
      nights: Math.ceil((normalizedCheckOut - normalizedCheckIn) / (1000 * 60 * 60 * 24)),
    },
  };
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
    glampIds, // Support multiple glamps
    checkInDate,
    checkOutDate,
    numberOfGuests, // Accept both formats
    guests, // Frontend may send 'guests' instead
    agentId // Optional: agent who referred this booking
  } = bookingData;

  // Support both 'guests' and 'numberOfGuests'
  const guestCount = guests || numberOfGuests || 1;

  // Resolve glamp IDs
  let targetGlampIds = [];
  if (glampIds && Array.isArray(glampIds) && glampIds.length > 0) {
    targetGlampIds = glampIds;
  } else if (glampId) {
    targetGlampIds = [glampId];
  } else {
    throw new ValidationError('Please select at least one glamp to book');
  }

  // Validate number of glamps (1..4)
  if (targetGlampIds.length > 4) {
    throw new ValidationError('You can book a maximum of 4 glamps');
  }

  // Validate required fields
  if (!customerName) {
    throw new ValidationError('Please provide your name');
  }

  if (!checkInDate || !checkOutDate) {
    throw new ValidationError('Please select check-in and check-out dates');
  }

  // Validate UUID format for all glamps
  for (const id of targetGlampIds) {
    if (!isValidUUID(id)) {
      throw new ValidationError('Invalid glamp selection. Please try again');
    }
  }

  if (agentId && !isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent reference');
  }

  // Validate email format if provided
  if (customerEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      throw new ValidationError('Please provide a valid email address');
    }
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

  // Validate Guests Capacity
  // Rule: Max capacity based on selected glamps
  // Fetch all glamps to get prices and details
  const glamps = await prisma.glamp.findMany({
    where: { id: { in: targetGlampIds } }
  });

  if (glamps.length !== targetGlampIds.length) {
    throw new NotFoundError('One or more selected glamps are no longer available');
  }

  const maxCapacity = glamps.reduce((sum, glamp) => sum + glamp.maxGuests, 0);
  if (guestCount > maxCapacity) {
    throw new ValidationError(`Selected glamps accommodate max ${maxCapacity} guests. You selected ${targetGlampIds.length} glamp(s).`);
  }

  // Check status and calculate total amount
  let totalAmount = 0;
  for (const glamp of glamps) {
    if (glamp.status !== 'ACTIVE') {
      throw new ValidationError(`Glamp "${glamp.name}" is currently unavailable. Please choose another one.`);
    }
    totalAmount += glamp.pricePerNight * nights;
  }

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
    glampIds: targetGlampIds,
    customerEmail: customerEmail || 'No Email',
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    nights,
    totalAmount: `$${totalAmount / 100}`,
  });

  // TRANSACTION: Re-check availability and create booking atomically
  const booking = await prisma.$transaction(async (tx) => {
    // Re-check conflicts for ALL glamps
    for (const gid of targetGlampIds) {
      const conflicts = await tx.booking.findMany({
        where: {
          glampId: gid, // Check legacy field for now, or check items? 
                        // Wait, if we use items, we should check items. 
                        // BUT existing bookings use glampId.
                        // New bookings will use items AND glampId (primary).
                        // So checking glampId is mostly safe for old bookings.
                        // For NEW bookings with multiple items, we need to check if ANY booking has this glamp as an item.
                        // However, since we haven't migrated existing bookings to items, 
                        // and we populate glampId for new bookings (at least one),
                        // we need to be careful.
                        // Ideally, we check:
                        // Booking where glampId = gid OR items contains gid
          OR: [
            { glampId: gid },
            { items: { some: { glampId: gid } } }
          ],
          status: {
            in: ['CONFIRMED', 'PENDING'],
          },
          AND: [
            { checkInDate: { lt: checkOut } },
            { checkOutDate: { gt: checkIn } },
          ],
        },
      });

      if (conflicts.length > 0) {
        throw new BookingConflictError({
          available: false,
          conflictingCount: conflicts.length,
          conflicts: conflicts.map(b => ({
            id: b.id,
            checkIn: b.checkInDate.toISOString(),
            checkOut: b.checkOutDate.toISOString(),
            status: b.status,
          })),
        });
      }
    }

    // No conflicts - create booking
    return tx.booking.create({
      data: {
        customerId: customer.id,
        customerName: customer.name, // Snapshot field
        agentId: agentId || null,
        glampId: targetGlampIds[0], // Primary glamp (for backward compatibility)
        glampName: glamps[0].name, // Snapshot field (primary)
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guests: guestCount,
        totalAmount,
        status: 'PENDING',
        items: {
          create: glamps.map(g => ({
            glampId: g.id,
            price: g.pricePerNight
          }))
        }
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
        items: {
          include: {
            glamp: {
              select: {
                name: true
              }
            }
          }
        }
      },
    });
  });

  // Log successful booking creation
  console.log('✅ Booking created successfully:', {
    bookingId: booking.id,
    customer: booking.customer.name,
    glampCount: booking.items.length,
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

  // Post booking revenue to Finance when status changes to CONFIRMED or COMPLETED
  if (newStatus === 'CONFIRMED' || newStatus === 'COMPLETED') {
    try {
      const financeResult = await postBookingToFinance(bookingId, userId);
      console.log('✅ Booking revenue posted to Finance:', financeResult.income?.id || 'already exists');
    } catch (error) {
      console.error('❌ Error posting booking to Finance:', error);
      // Don't fail the booking status update if finance posting fails
      // This can be retried manually or via backfill script
    }
  }

  return updatedBooking;
};
