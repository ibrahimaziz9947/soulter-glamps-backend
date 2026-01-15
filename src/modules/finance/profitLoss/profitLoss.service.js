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
  const incomeWhere = {
    deletedAt: null,
  };

  if (Object.keys(dateRange).length > 0) {
    incomeWhere.dateReceived = dateRange;
  }

  if (currency) {
    incomeWhere.currency = currency;
  }

  const incomeAggregation = await prisma.income.aggregate({
    where: incomeWhere,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalIncomeCents = incomeAggregation._sum.amount || 0;
  const incomeCount = incomeAggregation._count.id || 0;

  // ============================================
  // EXPENSES: Compute total expenses
  // ============================================
  // Date field: date (from expense.service.js pattern)
  // Amount field: amount (in cents)
  // Soft delete: deletedAt: null
  const expenseWhere = {
    deletedAt: null,
  };

  if (Object.keys(dateRange).length > 0) {
    expenseWhere.date = dateRange;
  }

  // Note: Expenses don't have currency field in schema, they're assumed to be in base currency

  const expenseAggregation = await prisma.expense.aggregate({
    where: expenseWhere,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalExpensesCents = expenseAggregation._sum.amount || 0;
  const expenseCount = expenseAggregation._count.id || 0;

  // ============================================
  // PURCHASES: Compute total purchases (payables)
  // ============================================
  // Date field: purchaseDate (from purchase.service.js pattern)
  // Amount field: amount (in cents)
  // Soft delete: deletedAt: null
  const purchaseWhere = {
    deletedAt: null,
  };

  if (Object.keys(dateRange).length > 0) {
    purchaseWhere.purchaseDate = dateRange;
  }

  if (currency) {
    purchaseWhere.currency = currency;
  }

  const purchaseAggregation = await prisma.purchase.aggregate({
    where: purchaseWhere,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalPurchasesCents = purchaseAggregation._sum.amount || 0;
  const purchaseCount = purchaseAggregation._count.id || 0;

  // ============================================
  // NET PROFIT: Income - Expenses - Purchases
  // ============================================
  const netProfitCents = totalIncomeCents - totalExpensesCents - totalPurchasesCents;

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
  };

  // ============================================
  // BREAKDOWN: Detailed groupings (optional)
  // ============================================
  if (includeBreakdown) {
    // Income by source
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

    // Expenses by category
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

    // Purchases by vendor
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

  return result;
};
