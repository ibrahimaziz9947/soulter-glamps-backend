import prisma from '../../../config/prisma.js';
import { computeProfitAndLoss } from '../profitLoss/profitLoss.service.js';
import { getStatements } from '../statements/statements.service.js';

/**
 * Get financial dashboard data
 * Combines KPIs (from profit-loss) and recent transactions (from statements)
 * Optimized with Promise.all for parallel data fetching
 * 
 * VERIFICATION: This service MUST return the same values as calling the individual endpoints:
 * - KPIs (totalIncomeCents, totalExpensesCents, netProfitCents) come from computeProfitAndLoss
 *   with EXACT same parameters as GET /api/finance/profit-loss
 * - recentTransactions comes from getStatements with EXACT same parameters as GET /api/finance/statements
 * - No recalculation or filtering happens here - we just pass through the results
 * 
 * @param {object} filters - Filter options
 * @param {Date|null} filters.fromDate - Start date as Date object (optional)
 * @param {Date|null} filters.toDate - End date as Date object (optional)
 * @param {string} filters.currency - Optional currency filter (3-char code, uppercase)
 * @param {number} filters.limit - Limit for recent transactions (default: 10)
 * @returns {Promise<object>} Dashboard data with KPIs and recent transactions
 */
export const getDashboardData = async (filters = {}) => {
  const { fromDate, toDate, currency, limit = 10 } = filters;

  console.log('[Dashboard Service] Incoming filters:', filters);

  // ============================================
  // DEFAULT: If no date range provided, use "this month" (UTC)
  // ============================================
  const now = new Date();
  const effectiveFromDate = fromDate || new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1,
    0, 0, 0, 0
  ));
  const effectiveToDate = toDate || now;

  // Convert to ISO strings for API calls to profit-loss and statements services
  const fromISO = effectiveFromDate.toISOString();
  const toISO = effectiveToDate.toISOString();

  // ============================================
  // NORMALIZE CURRENCY (match profit-loss and statements behavior)
  // ============================================
  // Both profit-loss and statements expect currency as uppercase 3-char code or undefined
  // Currency filter is optional - if not provided, services include all currencies
  const normalizedCurrency = currency ? currency.trim().toUpperCase() : undefined;

  // ============================================
  // BUILD EXACT PARAMETERS FOR PROFIT-LOSS SERVICE
  // ============================================
  // These parameters MUST match exactly what /api/finance/profit-loss endpoint uses
  const profitLossFilters = {
    from: fromISO,
    to: toISO,
    currency: normalizedCurrency,
    includeBreakdown: false, // Dashboard only needs totals, not breakdown
    expenseMode: 'approvedOnly', // Default: only APPROVED expenses (matches P&L default)
  };

  console.log('[Dashboard Service] Profit-Loss filters:', profitLossFilters);

  // ============================================
  // BUILD EXACT PARAMETERS FOR STATEMENTS SERVICE
  // ============================================
  // These parameters MUST match exactly what /api/finance/statements endpoint uses
  const statementsFilters = {
    from: fromISO,
    to: toISO,
    currency: normalizedCurrency,
    expenseMode: 'approvedOnly', // Default: only APPROVED expenses (matches statements default)
    includePurchases: true, // Default: include purchase records
    includePayments: true, // Default: include payment records (not used - no separate payments table)
    search: undefined, // No search filter for dashboard
    page: 1,
    pageSize: 1000, // Fetch enough data to compute accurate cash flow
    sortBy: 'date', // Default sort field (matches statements default)
    sortOrder: 'desc', // Default sort order (matches statements default)
  };

  console.log('[Dashboard Service] Statements filters:', statementsFilters);

  // ============================================
  // Build where clauses for payables (REUSE same patterns as payables service)
  // ============================================
  // NOTE: Purchase model has: amount, paidAmountCents, paymentStatus
  // Outstanding = amount - paidAmountCents (we'll calculate this manually)
  // IMPORTANT: Payables show ALL outstanding obligations (NOT date-filtered)
  // This matches the expected behavior - show what we currently owe, regardless of when purchased
  const payablesBaseWhere = {
    deletedAt: null,
    status: { in: ['DRAFT', 'CONFIRMED'] }, // Exclude CANCELLED
    paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, // Has outstanding balance
  };

  // Apply currency filter if provided (matches profit-loss/statements pattern)
  if (normalizedCurrency) {
    if (!payablesBaseWhere.AND) {
      payablesBaseWhere.AND = [];
    }
    payablesBaseWhere.AND.push({
      OR: [
        { currency: normalizedCurrency },
        { currency: null },
      ],
    });
  }

  // Overdue: has dueDate AND dueDate < now
  const overdueWhere = {
    ...payablesBaseWhere,
    dueDate: {
      not: null,
      lt: now,
    },
  };

  // ============================================
  // PARALLEL FETCH: Profit & Loss + Payables + Statements (Full Dataset for Cash Flow)
  // ============================================
  const [profitLossData, pendingPayables, overduePayables, statementsFullData] = await Promise.all([
    // 1) Profit & Loss KPIs - EXACT parameters from profitLossFilters
    computeProfitAndLoss(profitLossFilters),

    // 2) Pending payables - fetch purchases with UNPAID/PARTIAL status
    // We need to calculate outstanding = amount - paidAmountCents manually
    prisma.purchase.findMany({
      where: payablesBaseWhere,
      select: {
        id: true,
        amount: true,
        paidAmountCents: true,
      },
    }),

    // 3) Overdue payables - fetch purchases that are overdue
    prisma.purchase.findMany({
      where: overdueWhere,
      select: {
        id: true,
        amount: true,
        paidAmountCents: true,
      },
    }),

    // 4) Full statements data - EXACT parameters from statementsFilters
    getStatements(statementsFilters),
  ]);

  console.log('[Dashboard Service] Parallel fetch completed');

  // ============================================
  // VERIFICATION: Extract values WITHOUT modification
  // ============================================
  // Profit-loss returns: { summary: { totalIncome, totalExpenses (whole PKR), totalIncomeCents (legacy)... } }
  // Use new fields (whole currency units), fall back to legacy cents fields
  const profitLossSummary = profitLossData?.summary || {};
  
  // Use new fields (whole PKR) if available, otherwise use legacy cents fields and convert
  const totalIncome = profitLossSummary.totalIncome ?? Math.round((profitLossSummary.totalIncomeCents || 0) / 100);
  const totalExpenses = profitLossSummary.totalExpenses ?? Math.round((profitLossSummary.totalExpensesCents || 0) / 100);
  const totalPurchases = profitLossSummary.totalPurchases ?? Math.round((profitLossSummary.totalPurchasesCents || 0) / 100);
  const netProfit = profitLossSummary.netProfit ?? Math.round((profitLossSummary.netProfitCents || 0) / 100);

  console.log('[Dashboard Service] Profit-Loss Response Structure:', {
    hasData: !!profitLossData,
    hasSummary: !!profitLossData?.summary,
    summaryKeys: profitLossData?.summary ? Object.keys(profitLossData.summary) : [],
  });

  console.log('[Dashboard Service] Profit-Loss KPIs (whole PKR):', {
    totalIncome,
    totalExpenses,
    totalPurchases,
    netProfit,
  });

  // ============================================
  // CALCULATE PAYABLES KPIS (separate from P&L)
  // ============================================
  // FIX: Calculate outstanding amounts, NOT total amounts
  // Outstanding = totalAmount - paidAmount (what's still owed)
  // This ensures dashboard matches the payables list outstanding totals
  const pendingPayablesCents = pendingPayables.reduce((sum, purchase) => {
    const outstanding = purchase.amount - (purchase.paidAmountCents || 0);
    return sum + outstanding;
  }, 0);

  const overduePayablesCents = overduePayables.reduce((sum, purchase) => {
    const outstanding = purchase.amount - (purchase.paidAmountCents || 0);
    return sum + outstanding;
  }, 0);

  // Build structured payables KPIs (converted to whole PKR)
  const pendingPayablesKPI = {
    count: pendingPayables.length,
    amount: Math.round(pendingPayablesCents / 100), // Whole PKR
    amountCents: pendingPayablesCents, // DEPRECATED: Legacy field
    currency: normalizedCurrency || 'PKR', // Default to PKR if no currency filter
  };

  const overduePayablesKPI = {
    count: overduePayables.length,
    amount: Math.round(overduePayablesCents / 100), // Whole PKR
    amountCents: overduePayablesCents, // DEPRECATED: Legacy field
    currency: normalizedCurrency || 'PKR',
  };

  // Debug log to verify calculation
  console.log('[Dashboard Service] Payables Calculation Debug:', {
    pendingCount: pendingPayables.length,
    pendingTotalAmount: pendingPayables.reduce((sum, p) => sum + p.amount, 0),
    pendingPaidAmount: pendingPayables.reduce((sum, p) => sum + (p.paidAmountCents || 0), 0),
    pendingOutstanding: pendingPayablesCents,
    overdueCount: overduePayables.length,
    overdueOutstanding: overduePayablesCents,
  });

  console.log('[Dashboard Service] Payables KPIs:', {
    pending: pendingPayablesKPI,
    overdue: overduePayablesKPI,
  });

  // ============================================
  // COMPUTE NET CASH FLOW FROM STATEMENTS (using EXACT data from statements service)
  // ============================================
  // Statements returns: { items: [...], pagination: {...}, totals: {...} }
  // Net cash flow = sum of all cash movements (in - out) from the SAME statements data
  // This ensures consistency - we're using the exact same filtered dataset as statements endpoint
  let netCashFlowCents = 0;
  const statementsItems = statementsFullData.items || [];
  
  if (statementsItems.length > 0) {
    netCashFlowCents = statementsItems.reduce((sum, entry) => {
      if (entry.direction === 'in') {
        return sum + (entry.amountCents || 0);
      } else if (entry.direction === 'out') {
        return sum - (entry.amountCents || 0);
      }
      return sum;
    }, 0);
  }

  console.log('[Dashboard Service] Net cash flow computed from statements:', netCashFlowCents, 'items:', statementsItems.length);

  // Convert to whole PKR
  const netCashFlow = Math.round(netCashFlowCents / 100);

  // ============================================
  // INVENTORY VALUE (Placeholder for future)
  // ============================================
  const inventoryValueCents = 0; // Return 0 for now if inventory module isn't real yet
  const inventoryValue = 0; // Whole PKR

  // ============================================
  // RECENT TRANSACTIONS (Limited subset from SAME statements data)
  // ============================================
  // VERIFICATION: We use the EXACT data from getStatements, already sorted by date DESC
  // Statements returns: { items: [...] }
  // Each item already has direction field and absolute amountCents from statements service
  const recentTransactions = statementsItems
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      type: entry.type,
      description: entry.title || entry.counterparty || 'Transaction', // Use title as description
      amount: Math.round((entry.amountCents || 0) / 100), // Whole PKR
      amountCents: entry.amountCents, // DEPRECATED: Legacy field
      currency: entry.currency,
      direction: entry.direction, // 'in' or 'out' from statements
      referenceId: entry.referenceId || null,
    }));

  console.log('[Dashboard Service] Recent transactions:', recentTransactions.length);
  if (recentTransactions.length > 0) {
    console.log('[Dashboard Service] Sample transaction:', JSON.stringify(recentTransactions[0], null, 2));
  }

  // ============================================
  // CURRENCY VERIFICATION
  // ============================================
  // If currency was provided, all KPIs are filtered to that currency
  // If currency was NOT provided, KPIs may include mixed currencies (same as profit-loss behavior)
  // The currency handling matches EXACTLY what profit-loss and statements do
  const returnedCurrency = normalizedCurrency || null;

  console.log('[Dashboard Service] Currency handling:', {
    requested: currency,
    normalized: normalizedCurrency,
    returned: returnedCurrency,
  });

  // ============================================
  // BUILD RESPONSE
  // ============================================
  const response = {
    range: {
      from: fromISO,
      to: toISO,
    },
    kpis: {
      // New format: Whole currency units (PKR)
      totalIncome,
      totalExpenses,
      totalPurchases, // Include purchases separately for transparency
      netProfit,
      pendingPayables: pendingPayablesKPI, // Structured object with count, amount (PKR), currency
      overduePayables: overduePayablesKPI, // Structured object with count, amount (PKR), currency
      netCashFlow,
      inventoryValue,
      currency: normalizedCurrency || 'PKR',
      
      // DEPRECATED: Legacy fields for backward compatibility (remove in next major version)
      totalIncomeCents: totalIncome * 100,
      totalExpensesCents: totalExpenses * 100,
      totalPurchasesCents: totalPurchases * 100,
      netProfitCents: netProfit * 100,
      pendingPayablesCents: pendingPayablesCents,
      overduePayablesCents: overduePayablesCents,
      netCashFlowCents,
      inventoryValueCents,
    },
    recentTransactions,
  };

  // Final validation log - ensure KPIs are not all zero
  console.log('[Dashboard Service] FINAL RESPONSE KPIs:', response.kpis);
  if (totalIncome === 0 && totalExpenses === 0 && netProfit === 0) {
    console.warn('[Dashboard Service] WARNING: All KPIs are zero - this may indicate data issue');
  }

  return response;
};
