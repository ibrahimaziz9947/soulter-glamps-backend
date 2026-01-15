import prisma from '../../../config/prisma.js';
import { ValidationError } from '../../../utils/errors.js';

/**
 * Compute Profit & Loss statement with income, expenses, and purchases
 * Follows patterns from income.service.js and purchase.service.js
 * 
 * @param {object} filters - Filter options
 * @param {string} filters.from - Start date (ISO format)
 * @param {string} filters.to - End date (ISO format)
 * @param {string} filters.currency - Optional currency filter
 * @param {boolean} filters.includeBreakdown - Include detailed breakdown (default: true)
 * @returns {Promise<object>} P&L summary with totals and optional breakdown
 */
export const computeProfitAndLoss = async (filters = {}) => {
  const { from, to, currency, includeBreakdown = true } = filters;

  // TEMP DEBUG: Log incoming filters
  console.log('[P&L DEBUG] Incoming filters:', { from, to, currency, includeBreakdown });

  // Build date range filters
  const dateRange = {};
  if (from) {
    dateRange.gte = new Date(from);
  }
  if (to) {
    dateRange.lte = new Date(to);
  }

  // ============================================
  // INCOME: Compute total income
  // ============================================
  // Date field: dateReceived (from income.service.js pattern)
  // Amount field: amount (in cents)
  // Soft delete: deletedAt: null
  // Status: Include DRAFT and CONFIRMED (exclude CANCELLED)
  // Currency: Include matching currency OR null (flexible matching)
  const incomeWhere = {
    deletedAt: null,
    status: {
      in: ['DRAFT', 'CONFIRMED'], // Exclude CANCELLED
    },
  };

  if (Object.keys(dateRange).length > 0) {
    incomeWhere.dateReceived = dateRange;
  }

  // FIX: Currency filter with OR logic to include null values
  if (currency) {
    incomeWhere.OR = [
      { currency: currency },
      { currency: null },
    ];
  }

  // TEMP DEBUG: Log Income where clause
  console.log('[P&L DEBUG] Income where:', JSON.stringify(incomeWhere, null, 2));

  const incomeAggregation = await prisma.income.aggregate({
    where: incomeWhere,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalIncomeCents = incomeAggregation._sum.amount || 0;
  const incomeCount = incomeAggregation._count.id || 0;

  // TEMP DEBUG: Log Income results
  console.log('[P&L DEBUG] Income results:', { incomeCount, totalIncomeCents });

  // ============================================
  // EXPENSES: Compute total expenses
  // ============================================
  // Date field: date (from expense.service.js pattern)
  // Amount field: amount (in cents)
  // Soft delete: deletedAt: null
  // Status: Include DRAFT, SUBMITTED, APPROVED (exclude REJECTED, CANCELLED)
  // Currency: Expenses don't have currency field in schema
  const expenseWhere = {
    deletedAt: null,
    status: {
      in: ['DRAFT', 'SUBMITTED', 'APPROVED'], // Exclude REJECTED, CANCELLED
    },
  };

  if (Object.keys(dateRange).length > 0) {
    expenseWhere.date = dateRange;
  }

  // Note: Expenses don't have currency field in schema, they're assumed to be in base currency

  // TEMP DEBUG: Log Expense where clause
  console.log('[P&L DEBUG] Expense where:', JSON.stringify(expenseWhere, null, 2));

  const expenseAggregation = await prisma.expense.aggregate({
    where: expenseWhere,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalExpensesCents = expenseAggregation._sum.amount || 0;
  const expenseCount = expenseAggregation._count.id || 0;

  // TEMP DEBUG: Log Expense results
  console.log('[P&L DEBUG] Expense results:', { expenseCount, totalExpensesCents });

  // ============================================
  // PURCHASES: Compute total purchases (payables)
  // ============================================
  // Date field: purchaseDate (from purchase.service.js pattern)
  // Amount field: amount (in cents)
  // Soft delete: deletedAt: null
  // Status: Include DRAFT and CONFIRMED (exclude CANCELLED)
  // Currency: Include matching currency OR null (flexible matching)
  const purchaseWhere = {
    deletedAt: null,
    status: {
      in: ['DRAFT', 'CONFIRMED'], // Exclude CANCELLED
    },
  };

  if (Object.keys(dateRange).length > 0) {
    purchaseWhere.purchaseDate = dateRange;
  }

  // FIX: Currency filter with OR logic to include null values
  if (currency) {
    purchaseWhere.OR = [
      { currency: currency },
      { currency: null },
    ];
  }

  // TEMP DEBUG: Log Purchase where clause
  console.log('[P&L DEBUG] Purchase where:', JSON.stringify(purchaseWhere, null, 2));

  const purchaseAggregation = await prisma.purchase.aggregate({
    where: purchaseWhere,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalPurchasesCents = purchaseAggregation._sum.amount || 0;
  const purchaseCount = purchaseAggregation._count.id || 0;

  // TEMP DEBUG: Log Purchase results
  console.log('[P&L DEBUG] Purchase results:', { purchaseCount, totalPurchasesCents });

  // ============================================
  // NET PROFIT: Income - Expenses - Purchases
  // ============================================
  const netProfitCents = totalIncomeCents - totalExpensesCents - totalPurchasesCents;

  // TEMP DEBUG: Log final calculation
  console.log('[P&L DEBUG] Final calculation:', {
    totalIncomeCents,
    totalExpensesCents,
    totalPurchasesCents,
    netProfitCents,
  });

  // Build base response
  const result = {
    filters: {
      from: from || null,
      to: to || null,
      currency: currency || null,
    },
    summary: {
      totalIncomeCents,
      totalExpensesCents,
      totalPurchasesCents,
      netProfitCents,
    },
    // TEMP DEBUG: Add debug counts for verification
    debugCounts: {
      income: incomeCount,
      expenses: expenseCount,
      purchases: purchaseCount,
    },
  };

  // ============================================
  // BREAKDOWN: Detailed groupings (optional)
  // ============================================
  if (includeBreakdown) {
    // Income by source (use same where clause)
    const incomeBySourceRaw = await prisma.income.groupBy({
      by: ['source'],
      where: incomeWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    const incomeBySource = incomeBySourceRaw.map((item) => ({
      source: item.source,
      totalCents: item._sum.amount || 0,
      count: item._count.id,
    }));

    // Expenses by category (use same where clause)
    // Need to group by categoryId and then join with ExpenseCategory to get names
    const expensesByCategoryRaw = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: expenseWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    // Fetch category names
    const categoryIds = expensesByCategoryRaw
      .map((item) => item.categoryId)
      .filter((id) => id !== null);

    const categories = await prisma.expenseCategory.findMany({
      where: {
        id: { in: categoryIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {});

    const expensesByCategory = expensesByCategoryRaw.map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryId ? (categoryMap[item.categoryId] || 'Unknown') : 'Uncategorized',
      totalCents: item._sum.amount || 0,
      count: item._count.id,
    }));

    // Purchases by vendor (use same where clause)
    const purchasesByVendorRaw = await prisma.purchase.groupBy({
      by: ['vendorName'],
      where: purchaseWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    const purchasesByVendor = purchasesByVendorRaw.map((item) => ({
      vendorName: item.vendorName,
      totalCents: item._sum.amount || 0,
      count: item._count.id,
    }));

    result.breakdown = {
      incomeBySource,
      expensesByCategory,
      purchasesByVendor,
    };
  }

  // TEMP DEBUG: Log final result summary
  console.log('[P&L DEBUG] Returning result with counts:', {
    incomeCount,
    expenseCount,
    purchaseCount,
    totalIncomeCents,
    totalExpensesCents,
    totalPurchasesCents,
  });

  return result;
};
