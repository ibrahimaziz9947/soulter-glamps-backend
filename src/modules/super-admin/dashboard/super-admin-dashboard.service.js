/**
 * Super Admin Dashboard Service
 * Provides comprehensive system metrics for super admin dashboard
 * 
 * DESIGN DECISIONS:
 * - totalBookings: Uses createdAt (booking creation time) for consistency with other reports
 * - revenueCents: Primary source is Booking.totalAmount for CONFIRMED/COMPLETED bookings
 *                 Fallback to Income table if needed for manual entries
 * - pendingCommissions: Uses Commission.status = UNPAID (matches admin commission module)
 * - financeSnapshot: Reuses existing profit/loss service for consistency
 * - systemHealth: Simple SELECT 1 check via Prisma
 */

import prisma from '../../../config/prisma.js';
import { computeProfitAndLoss } from '../../finance/profitLoss/profitLoss.service.js';

/**
 * Get super admin dashboard summary
 * @param {Object} filters - Date range filters
 * @param {Date} filters.from - Start date
 * @param {Date} filters.to - End date
 * @returns {Promise<Object>} Dashboard summary metrics
 */
export const getDashboardSummary = async (filters) => {
  const { from, to } = filters;

  console.log('[SUPER ADMIN DASHBOARD] getDashboardSummary() called with filters:', { from, to });

  // Build date range for queries
  const dateRange = {};
  if (from) {
    dateRange.gte = from;
  }
  if (to) {
    dateRange.lte = to;
  }

  // ============================================
  // 1. Total Bookings (count within date range)
  // ============================================
  const bookingWhere = {};
  if (Object.keys(dateRange).length > 0) {
    bookingWhere.createdAt = dateRange;
  }

  const totalBookings = await prisma.booking.count({
    where: bookingWhere,
  });

  console.log('[SUPER ADMIN DASHBOARD] totalBookings:', totalBookings);

  // ============================================
  // 2. Revenue (sum of CONFIRMED and COMPLETED bookings)
  // ============================================
  // PRIMARY SOURCE: Booking.totalAmount for CONFIRMED/COMPLETED bookings
  // This matches the standard revenue calculation used throughout the system
  // FALLBACK: If no booking revenue, check Income table for manual entries
  
  const revenueWhere = {
    ...bookingWhere,
    status: { in: ['CONFIRMED', 'COMPLETED'] },
  };

  const revenueAggregation = await prisma.booking.aggregate({
    where: revenueWhere,
    _sum: { totalAmount: true },
  });

  let revenueCents = revenueAggregation._sum.totalAmount || 0;

  // Fallback: If no booking revenue and date range exists, check Income table
  // This handles manual income entries not tied to bookings
  if (revenueCents === 0 && Object.keys(dateRange).length > 0) {
    const incomeWhere = {
      AND: [
        { deletedAt: null },
        { status: { in: ['CONFIRMED'] } }, // Only confirmed income
      ],
    };
    
    if (dateRange.gte || dateRange.lte) {
      incomeWhere.AND.push({ dateReceived: dateRange });
    }

    const incomeAggregation = await prisma.income.aggregate({
      where: incomeWhere,
      _sum: { amount: true },
    });

    const incomeAmount = incomeAggregation._sum.amount || 0;
    if (incomeAmount > 0) {
      revenueCents = incomeAmount;
      console.log('[SUPER ADMIN DASHBOARD] Using fallback Income revenue:', incomeAmount);
    }
  }

  console.log('[SUPER ADMIN DASHBOARD] revenueCents:', revenueCents);

  // ============================================
  // 3. Pending Commissions
  // ============================================
  // Uses Commission.status = UNPAID (matches admin/agent commission module)
  // Schema: CommissionStatus enum has UNPAID and PAID values
  // Note: Commissions are global (not date-filtered) to show total outstanding
  
  const pendingCommissionsAgg = await prisma.commission.aggregate({
    where: {
      status: 'UNPAID',
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const pendingCommissions = {
    count: pendingCommissionsAgg._count.id || 0,
    amountCents: pendingCommissionsAgg._sum.amount || 0,
  };

  console.log('[SUPER ADMIN DASHBOARD] pendingCommissions:', pendingCommissions);

  // ============================================
  // 4. Finance Snapshot (within date range)
  // ============================================
  // REUSE existing Profit/Loss service for consistency with finance module
  // This ensures the super admin dashboard shows the same numbers as detailed P&L reports
  // The profit/loss service includes: Income, Expenses (APPROVED), Purchases
  
  let financeSnapshot = {
    revenueCents: 0,
    expenseCents: 0,
    profitCents: 0,
  };

  try {
    // Build filters for profit/loss computation
    const plFilters = {
      includeBreakdown: false, // We only need summary totals
      expenseMode: 'approvedOnly', // Match standard P&L calculation
    };

    if (from) {
      plFilters.from = from.toISOString();
    }
    if (to) {
      plFilters.to = to.toISOString();
    }

    // Call existing profit/loss service
    const profitLoss = await computeProfitAndLoss(plFilters);

    financeSnapshot = {
      revenueCents: profitLoss.totalIncomeCents || 0,
      expenseCents: profitLoss.totalExpensesCents || 0,
      profitCents: profitLoss.netProfitCents || 0,
    };

    console.log('[SUPER ADMIN DASHBOARD] financeSnapshot (from P&L service):', financeSnapshot);
  } catch (error) {
    console.error('[SUPER ADMIN DASHBOARD] Failed to compute finance snapshot:', error);
    // Fallback to basic calculation if P&L service fails
    const expenseWhere = {
      status: 'APPROVED',
      deletedAt: null,
    };
    if (Object.keys(dateRange).length > 0) {
      expenseWhere.date = dateRange;
    }

    const expenseAggregation = await prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
    });

    const expenseCents = expenseAggregation._sum.amount || 0;
    const profitCents = revenueCents - expenseCents;

    financeSnapshot = {
      revenueCents,
      expenseCents,
      profitCents,
    };

    console.log('[SUPER ADMIN DASHBOARD] financeSnapshot (fallback calculation):', financeSnapshot);
  }

  // ============================================
  // 5. System Health Check
  // ============================================
  let systemHealth = {
    ok: false,
    db: 'fail',
  };

  try {
    // Simple database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    systemHealth = {
      ok: true,
      db: 'ok',
    };
  } catch (error) {
    console.error('[SUPER ADMIN DASHBOARD] Database health check failed:', error);
    systemHealth = {
      ok: false,
      db: 'fail',
    };
  }

  console.log('[SUPER ADMIN DASHBOARD] systemHealth:', systemHealth);

  // ============================================
  // Return comprehensive summary
  // ============================================
  return {
    range: {
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
    },
    totalBookings,
    revenueCents,
    pendingCommissions,
    financeSnapshot,
    systemHealth,
  };
};

/**
 * Ping check - Simple database connectivity test
 * @returns {Promise<Object>} Health status
 */
export const pingCheck = async () => {
  console.log('[SUPER ADMIN DASHBOARD] pingCheck() called');

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      ok: true,
      db: 'ok',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[SUPER ADMIN DASHBOARD] Ping check failed:', error);
    
    return {
      ok: false,
      db: 'fail',
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
};
