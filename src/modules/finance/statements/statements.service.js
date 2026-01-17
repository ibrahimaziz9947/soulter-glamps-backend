import prisma from '../../../config/prisma.js';
import { Prisma } from '@prisma/client';

/**
 * Get unified financial statements (ledger view) using single SQL UNION ALL query.
 * Combines Income, Expense, and Purchase records into a unified ledger view.
 * 
 * Note: There is no separate Payment table - payments are tracked on Purchase records
 * via paidAmountCents, paidAt, and paymentStatus fields.
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
 * @param {string} filters.sort - 'asc' or 'desc'
 * @returns {Promise<object>} Ledger entries with pagination
 */
export const getStatements = async (filters = {}) => {
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
    sort = 'desc'
  } = filters;

  console.log('[Statements Service SQL] Incoming filters:', filters);

  // ============================================
  // BUILD SQL QUERIES WITH PARAMETER BINDING
  // ============================================

  // Build date conditions
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

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

  // Build search pattern
  const searchPattern = search ? `%${search}%` : null;

  // ============================================
  // BUILD INCOME QUERY
  // ============================================
  const incomeParams = [];
  let incomeQuery = `
    SELECT 
      CONCAT('INCOME-', i.id::text) as id,
      i."dateReceived" as date,
      'INCOME' as type,
      i.id::text as "referenceId",
      COALESCE(i.title, 'Income') as title,
      NULL as counterparty,
      COALESCE(i.source::text, 'Other') as category,
      i.status::text as status,
      i.currency,
      i.amount as "amountCents",
      i."createdAt",
      i."updatedAt"
    FROM "Income" i
    WHERE i."deletedAt" IS NULL
      AND i.status IN ('DRAFT', 'CONFIRMED')
  `;

  if (fromDate) {
    incomeParams.push(fromDate);
    incomeQuery += ` AND i."dateReceived" >= $${incomeParams.length}`;
  }
  if (toDate) {
    incomeParams.push(toDate);
    incomeQuery += ` AND i."dateReceived" <= $${incomeParams.length}`;
  }
  if (currency) {
    incomeParams.push(currency);
    incomeQuery += ` AND (i.currency = $${incomeParams.length} OR i.currency IS NULL)`;
  }
  if (searchPattern) {
    incomeParams.push(searchPattern, searchPattern, searchPattern);
    const idx = incomeParams.length;
    incomeQuery += ` AND (i.title ILIKE $${idx-2} OR i.source::text ILIKE $${idx-1} OR i.notes ILIKE $${idx})`;
  }

  // ============================================
  // BUILD EXPENSE QUERY
  // ============================================
  const expenseParams = [];
  let expenseQuery = `
    SELECT 
      CONCAT('EXPENSE-', e.id::text) as id,
      e.date as date,
      'EXPENSE' as type,
      e.id::text as "referenceId",
      COALESCE(e.title, 'Expense') as title,
      NULL as counterparty,
      COALESCE(ec.name, 'Uncategorized') as category,
      e.status::text as status,
      NULL as currency,
      -ABS(e.amount) as "amountCents",
      e."createdAt",
      e."updatedAt"
    FROM "Expense" e
    LEFT JOIN "ExpenseCategory" ec ON e."categoryId" = ec.id
    WHERE e."deletedAt" IS NULL
      AND e.status = ANY($1::text[])
  `;
  expenseParams.push(expenseStatuses);

  if (fromDate) {
    expenseParams.push(fromDate);
    expenseQuery += ` AND e.date >= $${expenseParams.length}`;
  }
  if (toDate) {
    expenseParams.push(toDate);
    expenseQuery += ` AND e.date <= $${expenseParams.length}`;
  }
  if (searchPattern) {
    expenseParams.push(searchPattern, searchPattern, searchPattern);
    const idx = expenseParams.length;
    expenseQuery += ` AND (e.title ILIKE $${idx-2} OR e.description ILIKE $${idx-1} OR ec.name ILIKE $${idx})`;
  }

  // ============================================
  // BUILD PURCHASE QUERY
  // ============================================
  const purchaseParams = [];
  let purchaseQuery = '';
  
  if (includePurchases) {
    purchaseQuery = `
    SELECT 
      CONCAT('PURCHASE-', p.id::text) as id,
      p."purchaseDate" as date,
      'PURCHASE' as type,
      p.id::text as "referenceId",
      COALESCE(p.title, 'Purchase') as title,
      p."vendorName" as counterparty,
      COALESCE(p."vendorName", 'Uncategorized') as category,
      p.status::text as status,
      p.currency,
      -ABS(p.amount) as "amountCents",
      p."createdAt",
      p."updatedAt"
    FROM "Purchase" p
    WHERE p."deletedAt" IS NULL
      AND p.status IN ('DRAFT', 'CONFIRMED')
    `;

    if (fromDate) {
      purchaseParams.push(fromDate);
      purchaseQuery += ` AND p."purchaseDate" >= $${purchaseParams.length}`;
    }
    if (toDate) {
      purchaseParams.push(toDate);
      purchaseQuery += ` AND p."purchaseDate" <= $${purchaseParams.length}`;
    }
    if (currency) {
      purchaseParams.push(currency);
      purchaseQuery += ` AND (p.currency = $${purchaseParams.length} OR p.currency IS NULL)`;
    }
    if (searchPattern) {
      purchaseParams.push(searchPattern, searchPattern, searchPattern);
      const idx = purchaseParams.length;
      purchaseQuery += ` AND (p.title ILIKE $${idx-2} OR p."vendorName" ILIKE $${idx-1} OR p.description ILIKE $${idx})`;
    }
  }

  // ============================================
  // COMBINE WITH UNION ALL AND ADD PAGINATION
  // ============================================
  const queries = [incomeQuery, expenseQuery];
  if (includePurchases && purchaseQuery) {
    queries.push(purchaseQuery);
  }

  const unionQuery = queries.join(' UNION ALL ');
  const sortDirection = sort === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * pageSize;

  const finalQuery = `
    WITH combined AS (
      ${unionQuery}
    )
    SELECT * FROM combined
    ORDER BY date ${sortDirection}, "createdAt" ${sortDirection}
    LIMIT $${queries.length * 10 + 1} OFFSET $${queries.length * 10 + 2}
  `;

  const countQuery = `
    WITH combined AS (
      ${unionQuery}
    )
    SELECT COUNT(*)::int as total FROM combined
  `;

  // Merge all parameters
  const allParams = [...incomeParams, ...expenseParams];
  if (includePurchases) {
    allParams.push(...purchaseParams);
  }
  
  // Add pagination params
  const queryParams = [...allParams, pageSize, offset];
  const countParams = [...allParams];

  console.log('[Statements Service SQL] Query params:', queryParams.length, 'Count params:', countParams.length);

  // ============================================
  // BUILD TOTALS QUERY (SUM OF AMOUNTS)
  // ============================================
  const totalsQuery = `
    WITH combined AS (
      ${unionQuery}
    )
    SELECT 
      SUM(CASE WHEN "amountCents" > 0 THEN "amountCents" ELSE 0 END)::bigint as "totalInCents",
      SUM(CASE WHEN "amountCents" < 0 THEN "amountCents" ELSE 0 END)::bigint as "totalOutCents",
      SUM("amountCents")::bigint as "netCents"
    FROM combined
  `;

  // ============================================
  // EXECUTE QUERIES USING $queryRawUnsafe
  // ============================================
  try {
    const [items, countResult, totalsResult] = await Promise.all([
      prisma.$queryRawUnsafe(finalQuery, ...queryParams),
      prisma.$queryRawUnsafe(countQuery, ...countParams),
      prisma.$queryRawUnsafe(totalsQuery, ...countParams),
    ]);

    const totalItems = parseInt(countResult[0]?.total || 0);
    const totalPages = Math.ceil(totalItems / pageSize);

    // Extract totals
    const totalInCents = parseInt(totalsResult[0]?.totalInCents || 0);
    const totalOutCents = parseInt(totalsResult[0]?.totalOutCents || 0);
    const netCents = parseInt(totalsResult[0]?.netCents || 0);

    console.log('[Statements Service SQL] Results:', {
      itemsReturned: items.length,
      totalItems,
      totalPages,
      totals: { totalInCents, totalOutCents, netCents },
    });

    // ============================================
    // GET DEBUG COUNTS BY TYPE
    // ============================================
    const incomeCountQuery = `
      SELECT COUNT(*)::int as count
      FROM "Income" i
      WHERE i."deletedAt" IS NULL
        AND i.status IN ('DRAFT', 'CONFIRMED')
        ${fromDate ? `AND i."dateReceived" >= $1` : ''}
        ${toDate ? `AND i."dateReceived" <= $${fromDate ? 2 : 1}` : ''}
        ${currency ? `AND (i.currency = $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + 1} OR i.currency IS NULL)` : ''}
        ${searchPattern ? `AND (i.title ILIKE $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + (currency ? 1 : 0) + 1} OR i.source::text ILIKE $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + (currency ? 1 : 0) + 2} OR i.notes ILIKE $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + (currency ? 1 : 0) + 3})` : ''}
    `;

    const expenseCountQuery = `
      SELECT COUNT(*)::int as count
      FROM "Expense" e
      LEFT JOIN "ExpenseCategory" ec ON e."categoryId" = ec.id
      WHERE e."deletedAt" IS NULL
        AND e.status = ANY($1::text[])
        ${fromDate ? `AND e.date >= $2` : ''}
        ${toDate ? `AND e.date <= $${fromDate ? 3 : 2}` : ''}
        ${searchPattern ? `AND (e.title ILIKE $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + 2} OR e.description ILIKE $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + 3} OR ec.name ILIKE $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + 4})` : ''}
    `;

    const purchaseCountQuery = includePurchases ? `
      SELECT COUNT(*)::int as count
      FROM "Purchase" p
      WHERE p."deletedAt" IS NULL
        AND p.status IN ('DRAFT', 'CONFIRMED')
        ${fromDate ? `AND p."purchaseDate" >= $1` : ''}
        ${toDate ? `AND p."purchaseDate" <= $${fromDate ? 2 : 1}` : ''}
        ${currency ? `AND (p.currency = $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + 1} OR p.currency IS NULL)` : ''}
        ${searchPattern ? `AND (p.title ILIKE $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + (currency ? 1 : 0) + 1} OR p."vendorName" ILIKE $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + (currency ? 1 : 0) + 2} OR p.description ILIKE $${(fromDate ? 1 : 0) + (toDate ? 1 : 0) + (currency ? 1 : 0) + 3})` : ''}
    ` : null;

    const [incomeCountRes, expenseCountRes, purchaseCountRes] = await Promise.all([
      prisma.$queryRawUnsafe(incomeCountQuery, ...incomeParams),
      prisma.$queryRawUnsafe(expenseCountQuery, ...expenseParams),
      includePurchases && purchaseCountQuery 
        ? prisma.$queryRawUnsafe(purchaseCountQuery, ...purchaseParams)
        : Promise.resolve([{ count: 0 }]),
    ]);

    const incomeCount = parseInt(incomeCountRes[0]?.count || 0);
    const expenseCount = parseInt(expenseCountRes[0]?.count || 0);
    const purchaseCount = parseInt(purchaseCountRes[0]?.count || 0);

    console.log('[Statements Service SQL] Debug counts:', {
      income: incomeCount,
      expenses: expenseCount,
      purchases: purchaseCount,
    });

    // ============================================
    // BUILD RESPONSE
    // ============================================
    return {
      items: items.map(item => ({
        ...item,
        date: item.date ? new Date(item.date).toISOString() : null,
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
        amountCents: parseInt(item.amountCents || 0),
      })),
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
        netCents,        // Net: totalInCents + totalOutCents (totalOutCents is already negative)
      },
      debug: {
        // Applied filters (for Railway deployment verification)
        filtersApplied: {
          from: from || null,
          to: to || null,
          currency: currency || null,
          expenseMode: expenseMode,
          includePurchases: includePurchases,
          includePayments: includePayments, // Always true - no separate payments table
          search: search || null,
          page: page,
          pageSize: pageSize,
          sort: sort,
        },
        // Human-readable filter summary
        filterSummary: {
          dateRange: from && to ? `${from} to ${to}` : from ? `from ${from}` : to ? `to ${to}` : 'all dates',
          currency: currency || 'all currencies',
          expenses: expenseMode === 'includeSubmitted' ? 'SUBMITTED + APPROVED' : 'APPROVED only',
          purchases: includePurchases ? 'included' : 'excluded',
          searchTerm: search ? `"${search}"` : 'none',
          pagination: `page ${page} of ${Math.ceil(totalItems / pageSize)} (${pageSize} per page)`,
        },
        counts: {
          income: incomeCount,
          expenses: expenseCount,
          purchases: includePurchases ? purchaseCount : 0,
          payments: 0, // No separate payments table
          total: totalItems,
        },
        serverTime: new Date().toISOString(),
        // Deployment verification
        endpoint: 'GET /api/finance/statements',
        version: 'v1-sql-union',
      },
    };
  } catch (error) {
    console.error('[Statements Service SQL] Error:', error);
    throw error;
  }
};
