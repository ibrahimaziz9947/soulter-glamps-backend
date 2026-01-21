/**
 * Super Admin Finance Controller
 * Provides combined financial summary by reusing existing services
 * 
 * @module super-admin-finance.controller
 */

import { asyncHandler } from '../../../utils/errors.js';
import { parseDateRange } from '../../../utils/dateRange.js';
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
 * - statements service for ledger entries and totals
 * - payables service for open payables
 * 
 * Returns:
 * - totals: { totalRevenueCents, totalExpensesCents, netProfitCents, currency }
 * - openPayables: { amountCents, count }
 * - recentLedgerEntries: Latest 10 ledger entries with full details
 */
export const getFinancialSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  // Parse date range (defaults to last 30 days, inclusive end-of-day)
  const dateRange = parseDateRange(from, to, 30);

  console.log('[Finance Summary] Date range:', dateRange);

  // ============================================================================
  // 1. LEDGER: Fetch statements for totals AND recent entries
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

  console.log('[Finance Summary] Ledger totals:', ledgerData.totals);
  console.log('[Finance Summary] Ledger items count:', ledgerData.items?.length || 0);

  // Safe access to items array (defensive coding)
  const ledgerItems = Array.isArray(ledgerData.items) ? ledgerData.items : [];
  
  // Extract totals from statements service
  // totalInCents = sum of all INCOME (positive amounts)
  // totalOutCents = sum of all EXPENSE + PURCHASE (negative amounts, stored as negative)
  // netCents = totalInCents + totalOutCents
  const totalRevenueCents = ledgerData.totals?.totalInCents || 0;
  const totalOutCents = ledgerData.totals?.totalOutCents || 0;
  
  // Convert totalOutCents to positive (it's stored as negative)
  const totalExpensesCents = Math.abs(totalOutCents);
  const netProfitCents = ledgerData.totals?.netCents || 0;

  // Map ledger entries to frontend format with all needed fields
  const recentLedgerEntries = ledgerItems.map(entry => {
    // Determine categoryLabel based on type
    let categoryLabel = 'N/A';
    if (entry.type === 'INCOME') {
      categoryLabel = entry.category || 'Income';
    } else if (entry.type === 'PURCHASE') {
      categoryLabel = entry.counterparty || entry.category || 'Purchases';
    } else if (entry.type === 'EXPENSE') {
      categoryLabel = entry.category || 'Expense';
    }

    // Determine description (prefer title, fallback to category/counterparty)
    const description = entry.title || entry.category || entry.counterparty || '';

    return {
      id: entry.id,
      date: entry.date,
      type: entry.type,
      categoryLabel,
      description,
      status: entry.status || 'CONFIRMED',
      currency: entry.currency || 'PKR',
      amountCents: entry.amountCents || 0, // Already absolute value from service
    };
  });

  // ============================================================================
  // 2. PAYABLES: Compute open payables (UNPAID + PARTIAL)
  // ============================================================================
  const payablesData = await payablesService.listPayables({
    page: 1,
    pageSize: 1000, // Get all to compute totals accurately
    // No status filter = gets all statuses, then we filter below
  });

  console.log('[Finance Summary] Payables count:', payablesData.items?.length || 0);

  // Safe access to items array (defensive coding)
  const payablesItems = Array.isArray(payablesData.items) ? payablesData.items : [];
  
  // Filter for open payables (UNPAID or PARTIAL)
  const openPayables = payablesItems.filter(
    p => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL'
  );

  const openPayablesCount = openPayables.length;
  const openPayablesAmountCents = openPayables.reduce(
    (sum, p) => sum + (p.outstandingCents || p.remainingAmountCents || 0), 
    0
  );

  console.log('[Finance Summary] Open payables:', { count: openPayablesCount, amountCents: openPayablesAmountCents });

  // ============================================================================
  // ASSEMBLE RESPONSE
  // ============================================================================
  return res.status(200).json({
    success: true,
    data: {
      totals: {
        totalRevenueCents,
        totalExpensesCents,
        netProfitCents,
        currency: 'PKR',
      },
      openPayables: {
        amountCents: openPayablesAmountCents,
        count: openPayablesCount,
      },
      recentLedgerEntries,
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
