# Financial Statements API Documentation

## Overview
The Financial Statements API provides a unified ledger view of all financial transactions across Income, Expenses, and Purchases using a **single SQL UNION ALL query** for optimal performance. This endpoint normalizes all transaction types into a consistent format for easy consumption by frontend applications.

**Note**: There is no separate Payment table in this system. Payments are tracked directly on Purchase records via fields like `paidAmountCents`, `paidAt`, and `paymentStatus`.

## Implementation
- **v2 - Prisma ORM**: Uses `prisma.findMany()` for reliable queries (replaced raw SQL)
- Fetches records separately per model (Income, Expense, Purchase)
- Normalizes all records to unified LedgerEntry format in Node.js
- Client-side sorting and pagination after normalization
- Separate count queries for debug metadata
- All amounts normalized: Income = positive, Expenses/Purchases = negative
- **More robust** than raw SQL - no table/column name mismatches

## Endpoint

```
GET /api/finance/statements
```

## Authentication
- **Required**: Yes
- **Role**: ADMIN or SUPER_ADMIN
- **Header**: `Authorization: Bearer <token>`

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `from` | string (YYYY-MM-DD) | - | Start date filter (inclusive) |
| `to` | string (YYYY-MM-DD) | - | End date filter (inclusive) |
| `currency` | string (3 chars) | - | Currency code filter (e.g., USD, EUR) |
| `expenseMode` | enum | `approvedOnly` | Expense filtering: `approvedOnly` (APPROVED only) or `includeSubmitted` (SUBMITTED + APPROVED). **DRAFT expenses never included.** Matches Profit & Loss endpoint. |
| `includePurchases` | boolean | `true` | Include purchase records |
| `includePayments` | boolean | `true` | Include payment records |
| `search` | string | - | Search in title, counterparty, and category fields |
| `page` | integer | `1` | Page number (minimum: 1) |
| `pageSize` | integer | `25` | Items per page (1-100) |
| `sortBy` | enum | `date` | Sort field: `date`, `createdAt`, or `amountCents` |
| `sortOrder` | enum | `desc` | Sort order: `asc` or `desc` |
| `sort` | enum | `desc` | Legacy: Sort order (deprecated, use `sortOrder`) |

## Response Format

```typescript
{
  success: boolean;
  data: {
    items: LedgerEntry[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    totals: {
      totalInCents: number;     // Sum of all positive amounts (income)
      totalOutCents: number;    // Sum of all negative amounts (expenses + purchases)
      netCents: number;         // Net: totalInCents + totalOutCents
    };
    debug: {
      filtersApplied: {         // Exact filters received
        from: string | null;
        to: string | null;
        currency: string | null;
        expenseMode: string;
        includePurchases: boolean;
        includePayments: boolean;
        search: string | null;
        page: number;
        pageSize: number;
        sort: string;
      };
      filterSummary: {          // Human-readable summary
        dateRange: string;
        currency: string;
        expenses: string;
        purchases: string;
        searchTerm: string;
        pagination: string;
      };
      counts: {
        income: number;
        expenses: number;
        purchases: number;
        payments: number;
        total: number;
      };
      serverTime: string;
      endpoint: string;
      version: string;
    };
  };
}
```

## LedgerEntry Schema

```typescript
interface LedgerEntry {
  id: string;                    // Composite: "TYPE-originalId" (e.g., "INCOME-123")
  date: string;                  // ISO 8601 date string
  type: "INCOME" | "EXPENSE" | "PURCHASE" | "PAYMENT";
  referenceId: string;           // Original record ID
  title: string;                 // Transaction title/description
  counterparty: string | null;   // Vendor, source, or customer name
  category: string;              // Category, source, or classification
  status: string;                // Original record status
  currency: string | null;       // Currency code (null for expenses)
  amountCents: number;           // Signed amount: positive for income, negative for expenses/purchases/payments
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

## Transaction Types

### INCOME
- **Source**: Income table
- **Date Field**: `dateReceived`
- **Amount**: Positive (as stored)
- **Status Filter**: DRAFT, CONFIRMED (excludes CANCELLED)
- **Counterparty**: Not applicable
- **Category**: Income source
- **SQL**: Part of UNION ALL query

### EXPENSE
- **Source**: Expense table
- **Date Field**: `date`
- **Amount**: Negative (absolute value negated)
- **Status Filter**: Based on `expenseMode` (matches Profit & Loss endpoint)
  - `approvedOnly` (default): Only **APPROVED** expenses
  - `includeSubmitted`: **SUBMITTED** + **APPROVED** expenses
  - **IMPORTANT**: **DRAFT** expenses are **NEVER** included in either mode
    - DRAFT is a working state for expenses that haven't been submitted yet
    - Only expenses that have been submitted for approval or already approved appear in statements
- **Counterparty**: Not applicable
- **Category**: Expense category name (joined from ExpenseCategory table)
- **Currency**: Not available in schema (null)
- **SQL**: Part of UNION ALL query

### PURCHASE
- **Source**: Purchase table
- **Date Field**: `purchaseDate`
- **Amount**: Negative (absolute value negated)
- **Status Filter**: DRAFT, CONFIRMED (excludes CANCELLED)
- **Counterparty**: Vendor name
- **Category**: Vendor name
- **Currency**: Purchase currency
- **SQL**: Part of UNION ALL query

### ~~PAYMENT~~ (Not Applicable)
**Note**: There is NO separate Payment table. The `includePayments` parameter is accepted for API compatibility but has no effect. Payments are tracked as part of the Purchase model using `paidAmountCents`, `paidAt`, and `paymentStatus` fields.

## Example Requests

### 1. Basic Request (Default Parameters)
```bash
curl -X GET "http://localhost:5001/api/finance/statements" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Date Range Filter
```bash
curl -X GET "http://localhost:5001/api/finance/statements?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Currency Filter
```bash
curl -X GET "http://localhost:5001/api/finance/statements?currency=USD" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Search Filter
```bash
curl -X GET "http://localhost:5001/api/finance/statements?search=booking" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Include Submitted Expenses
```bash
curl -X GET "http://localhost:5001/api/finance/statements?expenseMode=includeSubmitted" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Pagination
```bash
curl -X GET "http://localhost:5001/api/finance/statements?page=2&pageSize=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. Ascending Sort
```bash
curl -X GET "http://localhost:5001/api/finance/statements?sort=asc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8. Complex Filter Combination
```bash
curl -X GET "http://localhost:5001/api/finance/statements?from=2026-01-01&to=2026-01-31&currency=USD&search=glamp&expenseMode=includeSubmitted&sort=desc&page=1&pageSize=25" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 9. Exclude Purchases and Payments
```bash
curl -X GET "http://localhost:5001/api/finance/statements?includePurchases=false&includePayments=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Example Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "INCOME-550e8400-e29b-41d4-a716-446655440000",
        "date": "2026-01-15T00:00:00.000Z",
        "type": "INCOME",
        "referenceId": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Booking Payment - Glamp Site A",
        "counterparty": null,
        "category": "BOOKING",
        "status": "CONFIRMED",
        "currency": "USD",
        "amountCents": 50000,
        "createdAt": "2026-01-15T10:30:00.000Z",
        "updatedAt": "2026-01-15T10:30:00.000Z"
      },
      {
        "id": "EXPENSE-660e8400-e29b-41d4-a716-446655440001",
        "date": "2026-01-14T00:00:00.000Z",
        "type": "EXPENSE",
        "referenceId": "660e8400-e29b-41d4-a716-446655440001",
        "title": "Office Supplies",
        "counterparty": null,
        "category": "Office Expenses",
        "status": "APPROVED",
        "currency": null,
        "amountCents": -15000,
        "createdAt": "2026-01-14T09:15:00.000Z",
        "updatedAt": "2026-01-14T09:15:00.000Z"
      },
      {
        "id": "PURCHASE-770e8400-e29b-41d4-a716-446655440002",
        "date": "2026-01-13T00:00:00.000Z",
        "type": "PURCHASE",
        "referenceId": "770e8400-e29b-41d4-a716-446655440002",
        "title": "Camping Equipment",
        "counterparty": "OutdoorGear Inc",
        "category": "OutdoorGear Inc",
        "status": "CONFIRMED",
        "currency": "USD",
        "amountCents": -85000,
        "createdAt": "2026-01-13T14:20:00.000Z",
        "updatedAt": "2026-01-13T14:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "totalItems": 127,
      "totalPages": 6,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "totals": {
      "totalInCents": 50000,      // $500.00 total income
      "totalOutCents": -100000,   // -$1000.00 total expenses + purchases
      "netCents": -50000          // -$500.00 net (loss)
    },
    "debug": {
      "filtersApplied": {
        "from": "2026-01-01",
        "to": "2026-01-31",
        "currency": "USD",
        "expenseMode": "approvedOnly",
        "includePurchases": true,
        "includePayments": true,
        "search": null,
        "page": 1,
        "pageSize": 25,
        "sort": "desc"
      },
      "filterSummary": {
        "dateRange": "2026-01-01 to 2026-01-31",
        "currency": "USD",
        "expenses": "APPROVED only",
        "purchases": "included",
        "searchTerm": "none",
        "pagination": "page 1 of 6 (25 per page)"
      },
      "counts": {
        "income": 45,
        "expenses": 32,
        "purchases": 38,
        "payments": 0,
        "total": 127
      },
      "serverTime": "2026-01-17T15:30:00.000Z",
      "endpoint": "GET /api/finance/statements",
      "version": "v2-prisma-orm"
    }
  }
}
```

## Error Responses

### 400 Bad Request - Invalid Date Format
```json
{
  "success": false,
  "error": "Invalid from date. Expected ISO format (YYYY-MM-DD)"
}
```

### 400 Bad Request - Invalid Date Range
```json
{
  "success": false,
  "error": "From date must be before or equal to to date"
}
```

### 400 Bad Request - Invalid Currency
```json
{
  "success": false,
  "error": "Currency must be a 3-character code (e.g., USD, EUR)"
}
```

### 400 Bad Request - Invalid Expense Mode
```json
{
  "success": false,
  "error": "Invalid expenseMode. Must be \"approvedOnly\" or \"includeSubmitted\""
}
```

### 400 Bad Request - Invalid Sort
```json
{
  "success": false,
  "error": "Invalid sort. Must be \"asc\" or \"desc\""
}
```

### 400 Bad Request - Invalid Page
```json
{
  "success": false,
  "error": "Page must be >= 1"
}
```

### 400 Bad Request - Invalid Page (Non-Integer)
```json
{
  "success": false,
  "error": "Page must be a valid integer"
}
```

### 400 Bad Request - Invalid Page Size
```json
{
  "success": false,
  "error": "Page size must be between 1 and 100"
}
```

### 400 Bad Request - Invalid Page Size (Non-Integer)
```json
{
  "success": false,
  "error": "Page size must be a valid integer"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Admin access required"
}
```

## Implementation Notes

### Prisma ORM Approach (v2)
The API uses Prisma ORM for reliable queries:
```javascript
// Fetch separately per model
const incomeRecords = await prisma.income.findMany({ where, select });
const expenseRecords = await prisma.expense.findMany({ where, select });
const purchaseRecords = await prisma.purchase.findMany({ where, select });

// Normalize to unified format
const ledgerEntries = [...normalizeIncome(), ...normalizeExpense(), ...normalizePurchase()];

// Sort and paginate in Node.js
ledgerEntries.sort((a, b) => /* sortBy/sortOrder */);
const paginatedItems = ledgerEntries.slice(startIndex, endIndex);
```

This approach provides:
- **More reliable** - no raw SQL table/column name issues
- **Easier to maintain** - type-safe Prisma queries
- **Production proven** - matches other finance endpoints
- **Flexible sorting** - supports multiple sort fields

### Empty String Handling
The API automatically normalizes empty strings (`''`) in query parameters to `undefined`. This prevents issues where frontend applications might send empty strings that could cause unintended filtering behavior.

### Soft Deletes
All records with `deletedAt: null` are automatically excluded from the results across all transaction types.

### Amount Conventions
- **Income**: Positive amounts (as stored in database)
- **Expenses**: Negative amounts (stored amounts are negated)
- **Purchases**: Negative amounts (stored amounts are negated)
- **Payments**: Negative amounts (stored amounts are negated)

This convention makes it easy to sum all ledger entries to get a net position.

### Search Functionality
The `search` parameter performs case-insensitive partial matching across:
- **Income**: title, source, notes
- **Expenses**: title, description, category name
- **Purchases**: title, vendor name, description
- **Payments**: notes, payment method, associated purchase vendor

### Performance Considerations
- Large date ranges with no filters may return many records
- Use pagination to manage result sets
- Consider using the `pageSize` parameter to optimize response size
- The default page size of 25 provides a good balance

### Totals Calculation
The `totals` object in the response provides aggregate financial metrics:
- **totalInCents**: Sum of all positive amounts (income records only)
- **totalOutCents**: Sum of all negative amounts (expenses + purchases)
- **netCents**: Net position (totalInCents + totalOutCents)

**Important**: Totals are calculated from the **entire filtered dataset**, not just the current page. This means:
- Totals reflect all records matching your filters (date range, currency, search, etc.)
- Totals remain consistent across all pages of the same query
- The sum of `items[].amountCents` on the current page may differ from `netCents`

Example: If you have 100 records totaling $5000 net, but only show 25 per page:
- Page 1 items might sum to $1250
- But `totals.netCents` will always show 500000 (the full $5000)

### Query Parameter Validation
The API validates all query parameters with appropriate error messages:
- **page**: Must be a positive integer >= 1
- **pageSize**: Must be an integer between 1 and 100
- **from/to**: Must be valid ISO date format (YYYY-MM-DD)
- **currency**: Must be exactly 3 characters when provided
- **expenseMode**: Must be "approvedOnly" or "includeSubmitted"
- **sort**: Must be "asc" or "desc"

All validation errors return `400 Bad Request` with descriptive error messages.

## Related Endpoints
- `GET /api/finance/profit-loss` - Aggregated profit & loss report
- `GET /api/finance/income` - Detailed income records
- `GET /api/finance/expenses` - Detailed expense records
- `GET /api/finance/purchases` - Detailed purchase records
- `GET /api/finance/payables` - Payment records

## Testing
Use the provided test scripts:
- **Node.js**: `node test-statements.js`
- **PowerShell**: `.\test-statements.ps1 YOUR_TOKEN`
