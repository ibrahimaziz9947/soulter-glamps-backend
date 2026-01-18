/**
 * Super Admin Finance Controller
 * Provides combined financial summary by reusing existing services
 * 
 * @module super-admin-finance.controller
 */

import { asyncHandler } from '../../../utils/errors.js';
import { parseDateRange } from '../../../utils/dateRange.js';
import * as profitLossService from '../../finance/profitLoss/profitLoss.service.js';
import * as statementsService from '../../finance/statements/statements.service.js';
import * as payablesService from '../../finance/payables/payables.service.js';
import prisma from '../../../config/prisma.js';

/**
 * Get comprehensive financial summary combining multiple data sources
 * @route GET /api/super-admin/finance/summary
 * @access SUPER_ADMIN
 * 
 * Query params:
 * - from: Start date (YYYY-MM-DD or ISO datetime, optional; default: 30 days ago)
 * - to: End date (YYYY-MM-DD or ISO datetime, optional; default: now)
 * 
 * Reuses existing services:
 * - profitLoss service for revenue/expense/profit
 * - statements service for ledger entries
 * - payables service for open payables
 */
export const getFinancialSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  // Parse date range (defaults to last 30 days, inclusive end-of-day)
  const dateRange = parseDateRange(from, to, 30);

  // ============================================================================
  // 1. PROFIT & LOSS: Reuse existing service
  // ============================================================================
  const profitLossData = await profitLossService.computeProfitAndLoss({
    from: dateRange.fromISO,
    to: dateRange.toISO,
    includeBreakdown: false, // We only need totals for summary
    expenseMode: 'approvedOnly', // Only approved expenses
  });

  // ============================================================================
  // 2. LEDGER: Reuse existing statements service for latest entries
  // ============================================================================
  const ledgerData = await statementsService.getStatements({
    from: dateRange.fromISO,
    to: dateRange.toISO,
    page: 1,
    pageSize: 10, // Latest 10 entries
    sortBy: 'date',
    sortOrder: 'desc',
    expenseMode: 'approvedOnly',
    includePurchases: true,
  });

  // DEBUG: Verify response structure (remove after production verification)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Finance Summary] Ledger response keys:', Object.keys(ledgerData));
    console.log('[Finance Summary] Ledger items exist:', Boolean(ledgerData.items));
    console.log('[Finance Summary] Ledger items length:', ledgerData.items?.length || 0);
  }

  // Safe access to items array (statements service returns { items, pagination, totals })
  const ledgerItems = ledgerData.items || [];
  
  // Map ledger entries to simplified format
  const latestEntries = ledgerItems.map(entry => ({
    id: entry.id,
    date: entry.date,
    type: entry.type,
    description: entry.description,
    amountCents: entry.amountCents,
    direction: entry.direction,
    reference: entry.referenceId || null,
  }));

  // ============================================================================
  // 3. PAYABLES: Compute open payables (UNPAID + PARTIAL)
  // ============================================================================
  const payablesData = await payablesService.listPayables({
    page: 1,
    pageSize: 1000, // Get all to compute totals accurately
    // No status filter = gets all statuses, then we filter below
  });

  // DEBUG: Verify response structure (remove after production verification)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Finance Summary] Payables response keys:', Object.keys(payablesData));
    console.log('[Finance Summary] Payables items exist:', Boolean(payablesData.items));
    console.log('[Finance Summary] Payables items length:', payablesData.items?.length || 0);
  }

  // Safe access to items array (payables service returns { items, total, page, pageSize, totalPages })
  const payablesItems = payablesData.items || [];
  
  // Filter for open payables (UNPAID or PARTIAL)
  const openPayables = payablesItems.filter(
    p => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL'
  );

  const openPayablesCount = openPayables.length;
  const openPayablesAmountCents = openPayables.reduce(
    (sum, p) => sum + (p.outstandingCents || p.remainingAmountCents || 0), 
    0
  );

  // ============================================================================
  // 4. RECEIVABLES: Optional - set to 0 if not supported
  // ============================================================================
  // Note: Current system doesn't track receivables separately
  // Income is recorded when received, not when invoiced
  // If you add invoicing system later, compute receivables here

  // ============================================================================
  // ASSEMBLE RESPONSE
  // ============================================================================
  return res.status(200).json({
    success: true,
    data: {
      range: {
        from: dateRange.fromISO,
        to: dateRange.toISO,
      },
      profitLoss: {
        revenueCents: profitLossData.totalIncomeCents || 0,
        expenseCents: profitLossData.totalExpensesCents || 0,
        profitCents: profitLossData.netProfitCents || 0,
      },
      ledger: {
        totalEntries: ledgerData.pagination?.totalItems || 0,
        latestEntries,
        totals: ledgerData.totals || { totalInCents: 0, totalOutCents: 0, netCents: 0 },
      },
      payables: {
        openCount: openPayablesCount,
        openAmountCents: openPayablesAmountCents,
      },
      receivables: {
        count: 0,
        amountCents: 0,
        // Note: Receivables not supported in current system
        // Income is recorded when received, not when invoiced
      },
      systemNotes: [
        // Optional: Add system-wide financial notes here
        // Example: "End-of-month processing in progress"
      ],
    },
  });
});

/**
 * Health check endpoint for finance module
 * @route GET /api/super-admin/finance/ping
 * @access SUPER_ADMIN
 */
export const pingFinance = asyncHandler(async (req, res) => {
  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    return res.status(200).json({
      success: true,
      message: 'Finance module is operational',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
