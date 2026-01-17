/**
 * Admin Dashboard Service
 * Provides KPI metrics for the main admin dashboard
 */

import prisma from '../../../config/prisma.js';

/**
 * Get admin dashboard summary KPIs
 * @param {Object} filters - Date range filters
 * @param {Date} filters.from - Start date (start of day)
 * @param {Date} filters.to - End date (end of day)
 * @returns {Promise<Object>} Dashboard KPI metrics
 */
export const getDashboardSummary = async (filters) => {
  const { from, to } = filters;

  console.log('[ADMIN DASHBOARD] getDashboardSummary() called with filters:', { from, to });

  // Build date range for booking queries
  // Use createdAt to match existing "Recent Bookings" logic in booking.service.js
  const dateRange = {};
  if (from) {
    dateRange.gte = from;
  }
  if (to) {
    dateRange.lte = to;
  }

  // ============================================
  // 1. Total Bookings (count by createdAt within date range)
  // ============================================
  const bookingWhere = {};
  if (Object.keys(dateRange).length > 0) {
    bookingWhere.createdAt = dateRange;
  }

  const totalBookings = await prisma.booking.count({
    where: bookingWhere,
  });

  console.log('[ADMIN DASHBOARD] totalBookings:', totalBookings);

  // ============================================
  // 2. Revenue (sum totalAmount for CONFIRMED and COMPLETED bookings within date range)
  // Note: Using CONFIRMED and COMPLETED as they represent active/completed bookings
  // ============================================
  const revenueWhere = {
    ...bookingWhere,
    status: { in: ['CONFIRMED', 'COMPLETED'] },
  };

  const revenueAggregation = await prisma.booking.aggregate({
    where: revenueWhere,
    _sum: { totalAmount: true },
  });

  const revenueCents = revenueAggregation._sum.totalAmount || 0;

  console.log('[ADMIN DASHBOARD] revenueCents:', revenueCents);

  // ============================================
  // 3. Active Staff (count users with role ADMIN/SUPER_ADMIN and active=true)
  // Note: No date filtering for staff count - this is a current snapshot
  // Excludes CUSTOMER and AGENT roles
  // ============================================
  const activeStaff = await prisma.user.count({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      active: true,
    },
  });

  console.log('[ADMIN DASHBOARD] activeStaff:', activeStaff);

  // ============================================
  // 4. Occupancy Rate (booked nights / available nights * 100)
  // ============================================
  let occupancyRatePercent = 0;

  // Count active glamps (available units)
  const activeGlampsCount = await prisma.glamp.count({
    where: {
      status: 'ACTIVE',
    },
  });

  console.log('[ADMIN DASHBOARD] activeGlampsCount:', activeGlampsCount);

  if (activeGlampsCount > 0 && from && to) {
    // Calculate number of nights in date range
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    const numberOfNights = Math.round((to - from) / oneDay);

    console.log('[ADMIN DASHBOARD] numberOfNights in range:', numberOfNights);

    if (numberOfNights > 0) {
      // Available room-nights = number of active units * number of nights
      const availableRoomNights = activeGlampsCount * numberOfNights;

      // Calculate booked room-nights
      // Get all CONFIRMED/COMPLETED bookings that overlap with the date range
      const bookingsInRange = await prisma.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          // Booking overlaps with date range if:
          // checkInDate <= to AND checkOutDate >= from
          AND: [
            { checkInDate: { lte: to } },
            { checkOutDate: { gte: from } },
          ],
        },
        select: {
          checkInDate: true,
          checkOutDate: true,
        },
      });

      console.log('[ADMIN DASHBOARD] bookingsInRange count:', bookingsInRange.length);

      // Sum up booked nights for each booking
      let bookedRoomNights = 0;
      for (const booking of bookingsInRange) {
        // Calculate overlap between booking and date range
        const overlapStart = booking.checkInDate > from ? booking.checkInDate : from;
        const overlapEnd = booking.checkOutDate < to ? booking.checkOutDate : to;
        const overlapNights = Math.max(0, Math.round((overlapEnd - overlapStart) / oneDay));
        bookedRoomNights += overlapNights;
      }

      console.log('[ADMIN DASHBOARD] bookedRoomNights:', bookedRoomNights);
      console.log('[ADMIN DASHBOARD] availableRoomNights:', availableRoomNights);

      // Calculate occupancy rate percentage
      if (availableRoomNights > 0) {
        occupancyRatePercent = (bookedRoomNights / availableRoomNights) * 100;
      }
    }
  }

  console.log('[ADMIN DASHBOARD] occupancyRatePercent:', occupancyRatePercent);

  // ============================================
  // Return KPI summary
  // ============================================
  return {
    totalBookings,
    revenueCents,
    occupancyRatePercent: Math.round(occupancyRatePercent * 100) / 100, // Round to 2 decimal places
    activeStaff,
  };
};
