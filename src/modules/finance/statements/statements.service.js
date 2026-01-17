import prisma from '../../../config/prisma.js';

/**
 * Get unified financial statements (ledger view) using Prisma findMany.
 * Combines Income, Expense, and Purchase records into a unified ledger view.
 * 
 * Note: There is no separate Payment table - payments are tracked on Purchase records
 * via paidAmountCents, paidAt, and paymentStatus fields.
 * 
 * This implementation uses Prisma ORM queries instead of raw SQL for better reliability.
 * 
 * @param {object} filters - Filter options
 * @param {string} filters.from - Start date (ISO format)
 * @param {string} filters.to - End date (ISO format)
 * @param {string} filters.currency - Optional currency filter
 * @param {string} filters.expenseMode - 'approvedOnly' or 'includeSubmitted'
 * @param {boolean} filters.includePurchases - Include purchase records
 * @param {boolean} filters.includePayments - Not used (no separate payments table)
 * @param {string} filters.search - Search term
 * @param {number} filters.page - Page number
 * @param {number} filters.pageSize - Items per page
 * @param {string} filters.sortBy - Sort field: 'date', 'createdAt', 'amountCents'
 * @param {string} filters.sortOrder - Sort order: 'asc' or 'desc'
 * @returns {Promise<object>} Ledger entries with pagination
 */
export const getStatements = async (filters = {}) => {
  try {
    const { 
      from, 
      to, 
      currency, 
      expenseMode = 'approvedOnly',
      includePurchases = true,
      includePayments = true, // Not used - no separate payments table
      search,
      page = 1, 
      pageSize = 25,
      sortBy = 'date',
      sortOrder = 'desc'
    } = filters;

    console.log('[Statements Service] Incoming filters:', filters);

    // Build date range filters
    const dateRange = {};
    if (from) {
      dateRange.gte = new Date(from);
    }
    if (to) {
      dateRange.lte = new Date(to);
    }

    // ============================================
    // EXPENSE STATUS FILTER (MATCHES PROFIT-LOSS ENDPOINT)
    // ============================================
    // Determined by expenseMode query parameter:
    //   - approvedOnly (default): Only APPROVED expenses
    //   - includeSubmitted: SUBMITTED + APPROVED expenses
    // 
    // IMPORTANT: DRAFT expenses are NEVER included in statements.
    // DRAFT is a working state and should not appear in financial reports.
    // Only expenses that have been submitted for approval or already approved are shown.
    const expenseStatuses = expenseMode === 'includeSubmitted' 
      ? ['SUBMITTED', 'APPROVED']  // Include submitted + approved
      : ['APPROVED'];               // Include only approved (default)

    // ============================================
    // FETCH INCOME RECORDS
    // ============================================
    const incomeWhere = {
      AND: [
        { deletedAt: null },
        { status: { in: ['DRAFT', 'CONFIRMED'] } }, // Exclude CANCELLED
      ],
    };

    if (Object.keys(dateRange).length > 0) {
      incomeWhere.AND.push({ dateReceived: dateRange });
    }

    if (currency) {
      incomeWhere.AND.push({
        OR: [
          { currency: currency },
          { currency: null },
        ],
      });
    }

    if (search) {
      incomeWhere.AND.push({
        OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const incomeRecords = await prisma.income.findMany({
      where: incomeWhere,
      select: {
        id: true,
        dateReceived: true,
        reference: true,
        notes: true,
        source: true,
        status: true,
        currency: true,
        amount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('[Statements Service] Income records fetched:', incomeRecords.length);
    if (incomeRecords.length > 0) {
      console.log('[Statements Service] Sample income:', JSON.stringify(incomeRecords[0], null, 2));
    }

    // ============================================
    // FETCH EXPENSE RECORDS
    // ============================================
    const expenseWhere = {
      AND: [
        { deletedAt: null },
        { status: { in: expenseStatuses } },
      ],
    };

    if (Object.keys(dateRange).length > 0) {
      expenseWhere.AND.push({ date: dateRange });
    }

    if (search) {
      expenseWhere.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { vendor: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const expenseRecords = await prisma.expense.findMany({
      where: expenseWhere,
      select: {
        id: true,
        date: true,
        title: true,
        status: true,
        amount: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log('[Statements Service] Expense records fetched:', expenseRecords.length);
    if (expenseRecords.length > 0) {
      console.log('[Statements Service] Sample expense:', JSON.stringify(expenseRecords[0], null, 2));
    }

    // ============================================
    // FETCH PURCHASE RECORDS (if enabled)
    // ============================================
    let purchaseRecords = [];
    if (includePurchases) {
      const purchaseWhere = {
        AND: [
          { deletedAt: null },
          { status: { in: ['DRAFT', 'CONFIRMED'] } }, // Exclude CANCELLED
        ],
      };

      if (Object.keys(dateRange).length > 0) {
        purchaseWhere.AND.push({ purchaseDate: dateRange });
      }

      if (currency) {
        purchaseWhere.AND.push({
          OR: [
            { currency: currency },
            { currency: null },
          ],
        });
      }

      if (search) {
        purchaseWhere.AND.push({
          OR: [
            { reference: { contains: search, mode: 'insensitive' } },
            { vendorName: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
          ],
        });
      }

      purchaseRecords = await prisma.purchase.findMany({
        where: purchaseWhere,
        select: {
          id: true,
          purchaseDate: true,
          reference: true,
          notes: true,
          vendorName: true,
          status: true,
          currency: true,
          amount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      console.log('[Statements Service] Purchase records fetched:', purchaseRecords.length);
      if (purchaseRecords.length > 0) {
        console.log('[Statements Service] Sample purchase:', JSON.stringify(purchaseRecords[0], null, 2));
      }
    }

    // ============================================
    // NORMALIZE TO LEDGER ENTRY FORMAT
    // ============================================
    const ledgerEntries = [];

    // Add income entries (POSITIVE amounts)
    incomeRecords.forEach((income) => {
      ledgerEntries.push({
        id: `INCOME-${income.id}`,
        date: income.dateReceived,
        type: 'INCOME',
        referenceId: income.id,
        title: income.reference || income.notes || 'Income',
        counterparty: null,
        category: income.source || 'Other',
        status: income.status,
        currency: income.currency,
        amountCents: income.amount, // POSITIVE
        createdAt: income.createdAt,
        updatedAt: income.updatedAt,
      });
    });

    // Add expense entries (NEGATIVE amounts)
    expenseRecords.forEach((expense) => {
      ledgerEntries.push({
        id: `EXPENSE-${expense.id}`,
        date: expense.date,
        type: 'EXPENSE',
        referenceId: expense.id,
        title: expense.title || 'Expense',
        counterparty: null,
        category: expense.category?.name || 'Uncategorized',
        status: expense.status,
        currency: null, // Expenses don't have currency in schema
        amountCents: -Math.abs(expense.amount), // NEGATIVE
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      });
    });

    // Add purchase entries (NEGATIVE amounts)
    purchaseRecords.forEach((purchase) => {
      ledgerEntries.push({
        id: `PURCHASE-${purchase.id}`,
        date: purchase.purchaseDate,
        type: 'PURCHASE',
        referenceId: purchase.id,
        title: purchase.reference || purchase.vendorName || 'Purchase',
        counterparty: purchase.vendorName,
        category: purchase.vendorName || 'Uncategorized',
        status: purchase.status,
        currency: purchase.currency,
        amountCents: -Math.abs(purchase.amount), // NEGATIVE
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
      });
    });

    console.log('[Statements Service] Total ledger entries before sort:', ledgerEntries.length);
    if (ledgerEntries.length > 0) {
      console.log('[Statements Service] Sample ledger entry:', JSON.stringify(ledgerEntries[0], null, 2));
    }

    // ============================================
    // SORT BY REQUESTED FIELD
    // ============================================
    const sortField = sortBy === 'amountCents' ? 'amountCents' : sortBy === 'createdAt' ? 'createdAt' : 'date';
    const sortMultiplier = sortOrder === 'asc' ? 1 : -1;

    ledgerEntries.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle dates
      if (aVal instanceof Date && bVal instanceof Date) {
        return (aVal.getTime() - bVal.getTime()) * sortMultiplier;
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * sortMultiplier;
      }

      // Default comparison
      if (aVal < bVal) return -1 * sortMultiplier;
      if (aVal > bVal) return 1 * sortMultiplier;
      
      // Secondary sort by createdAt if primary fields are equal
      return (a.createdAt.getTime() - b.createdAt.getTime()) * sortMultiplier;
    });

    // ============================================
    // CALCULATE TOTALS (before pagination)
    // ============================================
    const totalInCents = ledgerEntries
      .filter(entry => entry.amountCents > 0)
      .reduce((sum, entry) => sum + entry.amountCents, 0);

    const totalOutCents = ledgerEntries
      .filter(entry => entry.amountCents < 0)
      .reduce((sum, entry) => sum + entry.amountCents, 0);

    const netCents = totalInCents + totalOutCents;

    // ============================================
    // PAGINATION
    // ============================================
    const totalItems = ledgerEntries.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = ledgerEntries.slice(startIndex, endIndex);

    console.log('[Statements Service] ====== PAGINATION DEBUG ======');
    console.log('[Statements Service] Input - page:', page, 'pageSize:', pageSize);
    console.log('[Statements Service] Computed - startIndex:', startIndex, 'endIndex:', endIndex);
    console.log('[Statements Service] Total items:', totalItems);
    console.log('[Statements Service] Paginated items length:', paginatedItems.length);
    console.log('[Statements Service] Total pages:', totalPages);
    console.log('[Statements Service] Totals:', { totalInCents, totalOutCents, netCents });
    if (paginatedItems.length > 0) {
      console.log('[Statements Service] First paginated item:', JSON.stringify(paginatedItems[0], null, 2));
    } else {
      console.log('[Statements Service] WARNING: paginatedItems is EMPTY despite totalItems =', totalItems);
    }
    console.log('[Statements Service] ===============================');

    // ============================================
    // BUILD RESPONSE
    // ============================================
    const responseItems = paginatedItems.map(item => ({
      ...item,
      // Add explicit direction field for dashboard
      direction: item.amountCents >= 0 ? 'in' : 'out',
      // Ensure amountCents is absolute value in response
      amountCents: Math.abs(item.amountCents),
      date: item.date ? item.date.toISOString() : null,
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    }));

    console.log('[Statements Service] Response items length:', responseItems.length);
    if (responseItems.length > 0) {
      console.log('[Statements Service] First response item:', JSON.stringify(responseItems[0], null, 2));
    }

    return {
      items: responseItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      totals: {
        totalInCents,    // Sum of all positive amounts (income)
        totalOutCents,   // Sum of all negative amounts (expenses + purchases)
        netCents,        // Net: totalInCents + totalOutCents
      },
      debug: {
        // Applied filters (for Railway deployment verification)
        filtersApplied: {
          from: from || null,
          to: to || null,
          currency: currency || null,
          expenseMode: expenseMode,
          includePurchases: includePurchases,
          includePayments: includePayments,
          search: search || null,
          page: page,
          pageSize: pageSize,
          sortBy: sortBy,
          sortOrder: sortOrder,
        },
        // Human-readable filter summary
        filterSummary: {
          dateRange: from && to ? `${from} to ${to}` : from ? `from ${from}` : to ? `to ${to}` : 'all dates',
          currency: currency || 'all currencies',
          expenses: expenseMode === 'includeSubmitted' ? 'SUBMITTED + APPROVED' : 'APPROVED only',
          purchases: includePurchases ? 'included' : 'excluded',
          searchTerm: search ? `"${search}"` : 'none',
          pagination: `page ${page} of ${totalPages} (${pageSize} per page)`,
          sorting: `${sortBy} ${sortOrder}`,
        },
        counts: {
          income: incomeRecords.length,
          expenses: expenseRecords.length,
          purchases: purchaseRecords.length,
          payments: 0, // No separate payments table
          total: totalItems,
        },
        serverTime: new Date().toISOString(),
        // Deployment verification
        endpoint: 'GET /api/finance/statements',
        version: 'v2-prisma-orm',
      },
    };
  } catch (error) {
    console.error('[STATEMENTS_ERROR]', error);
    console.error('[STATEMENTS_ERROR] Stack:', error.stack);
    console.error('[STATEMENTS_ERROR] Filters:', filters);
    throw error;
  }
};
