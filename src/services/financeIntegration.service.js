/**
 * Finance Booking Integration Service
 * Handles automatic posting of booking revenue to Finance Income when bookings are confirmed
 * 
 * DESIGN:
 * - When a booking status changes to CONFIRMED, automatically create an Income entry
 * - Use source=BOOKING, referenceId=bookingId for traceability
 * - Create a Statement entry with direction=INFLOW
 * - Idempotency: Check if income already exists for this booking to avoid duplicates
 * 
 * USAGE:
 * - Called from booking status update workflow
 * - Can be called manually to backfill existing confirmed bookings
 */

import prisma from '../config/prisma.js';

/**
 * Post booking revenue to Finance Income and Statements
 * Creates Income and Statement entries when a booking is confirmed
 * 
 * @param {string} bookingId - Booking ID to post to finance
 * @param {string} userId - User ID performing the action (for audit trail)
 * @returns {Promise<{income: object, statement: object|null}>}
 */
export const postBookingToFinance = async (bookingId, userId) => {
  console.log('[FINANCE INTEGRATION] Posting booking to finance:', bookingId);

  // Get booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      glamp: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  // Only post confirmed or completed bookings
  if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') {
    console.log('[FINANCE INTEGRATION] Booking not confirmed/completed, skipping:', booking.status);
    return { income: null, statement: null };
  }

  // Check if income already exists for this booking (idempotency)
  const existingIncome = await prisma.income.findFirst({
    where: {
      bookingId: bookingId,
      deletedAt: null,
    },
  });

  if (existingIncome) {
    console.log('[FINANCE INTEGRATION] Income already exists for booking, skipping:', existingIncome.id);
    return { income: existingIncome, statement: null };
  }

  // Create income entry
  const income = await prisma.income.create({
    data: {
      amount: booking.totalAmount,
      currency: 'USD', // Default currency - could be parameterized
      dateReceived: booking.updatedAt, // Use booking update time as received date
      source: 'BOOKING',
      status: 'CONFIRMED',
      reference: `BOOKING-${booking.id.substring(0, 8)}`,
      notes: `Booking revenue from ${booking.customerName} for ${booking.glampName} (${booking.checkInDate.toISOString().split('T')[0]} to ${booking.checkOutDate.toISOString().split('T')[0]})`,
      bookingId: bookingId,
      createdById: userId,
    },
  });

  console.log('[FINANCE INTEGRATION] Income created:', income.id, 'Amount:', income.amount);

  // TODO: Create Statement entry if Statement model exists
  // For now, we'll return null for statement
  let statement = null;

  // Check if Statement model exists
  try {
    // Attempt to create statement entry
    // Note: This assumes Statement model has fields: date, type, title, amountCents, direction, currency, referenceId
    // If Statement model doesn't exist or has different schema, this will be skipped
    statement = await prisma.statement.create({
      data: {
        date: income.dateReceived,
        type: 'INCOME',
        title: `Booking Revenue - ${booking.glampName}`,
        counterparty: booking.customerName,
        amountCents: booking.totalAmount,
        direction: 'INFLOW',
        currency: 'USD',
        referenceId: bookingId,
        source: 'BOOKING',
        notes: income.notes,
        createdById: userId,
      },
    });

    console.log('[FINANCE INTEGRATION] Statement created:', statement.id);
  } catch (error) {
    console.log('[FINANCE INTEGRATION] Statement creation skipped (model may not exist):', error.message);
  }

  return { income, statement };
};

/**
 * Backfill finance entries for existing confirmed bookings
 * Useful for migrating existing bookings to finance system
 * 
 * @param {string} userId - User ID performing the backfill
 * @param {object} options - Backfill options
 * @param {boolean} options.dryRun - If true, only log what would be done
 * @returns {Promise<{processed: number, created: number, skipped: number, errors: number}>}
 */
export const backfillBookingFinanceEntries = async (userId, options = {}) => {
  const { dryRun = false } = options;

  console.log('[FINANCE INTEGRATION] Starting backfill, dryRun:', dryRun);

  // Get all confirmed/completed bookings without income entries
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    include: {
      _count: {
        select: { incomes: true },
      },
    },
  });

  console.log('[FINANCE INTEGRATION] Found bookings:', bookings.length);

  const stats = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
  };

  for (const booking of bookings) {
    stats.processed++;

    try {
      // Check if income already exists
      const hasIncome = booking._count.incomes > 0;

      if (hasIncome) {
        console.log(`[FINANCE INTEGRATION] Skipping booking ${booking.id} - already has income`);
        stats.skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`[FINANCE INTEGRATION] [DRY RUN] Would create income for booking ${booking.id}, amount: ${booking.totalAmount}`);
        stats.created++;
      } else {
        const result = await postBookingToFinance(booking.id, userId);
        if (result.income) {
          console.log(`[FINANCE INTEGRATION] Created income for booking ${booking.id}`);
          stats.created++;
        } else {
          stats.skipped++;
        }
      }
    } catch (error) {
      console.error(`[FINANCE INTEGRATION] Error processing booking ${booking.id}:`, error);
      stats.errors++;
    }
  }

  console.log('[FINANCE INTEGRATION] Backfill complete:', stats);

  return stats;
};
