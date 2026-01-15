# Profit & Loss V1 API Documentation

## Overview

The Profit & Loss (P&L) V1 API provides consolidated financial reporting by computing totals from Income, Expense, and Purchase records. It follows the same patterns as existing finance summary endpoints (`/api/finance/income/summary`, `/api/finance/expenses/*`, `/api/finance/purchases/summary`).

## Endpoints

### 1. GET `/api/finance/profit-loss`

Returns full P&L statement with optional breakdown by source, category, and vendor.

- **Access:** ADMIN, SUPER_ADMIN
- **Authentication:** JWT Bearer token required

### 2. GET `/api/finance/profit-loss/summary`

Returns P&L summary with totals only (no breakdown). Useful for dashboard widgets and quick overview.

- **Access:** ADMIN, SUPER_ADMIN
- **Authentication:** JWT Bearer token required

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `from` | string (ISO date) | No | - | Start date for filtering records (e.g., `2026-01-01`) |
| `to` | string (ISO date) | No | - | End date for filtering records (e.g., `2026-01-31`) |
| `currency` | string | No | - | Currency filter (e.g., `USD`). Applies to Income and Purchases only |
| `includeBreakdown` | boolean | No | `true` | Include detailed breakdown (only for `/profit-loss` endpoint) |

**Note:** The `/summary` endpoint ignores the `includeBreakdown` parameter and never returns breakdown data.

## Validation Rules

### Date Validation
- Dates must be in ISO format: `YYYY-MM-DD`
- Invalid dates return `400` error: `{ success: false, error: "Invalid from date. Expected ISO format (YYYY-MM-DD)" }`
- If both `from` and `to` are provided, `from` must be <= `to`
- Invalid range returns `400` error: `{ success: false, error: "From date must be before or equal to to date" }`

### Currency Validation
- Must be exactly 3 characters (e.g., `USD`, `EUR`)
- Invalid currency returns `400` error: `{ success: false, error: "Currency must be a 3-character code (e.g., USD, EUR)" }`
- Automatically converted to uppercase

## Response Format

### Full P&L Response (GET `/profit-loss`)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "filters": {
      "from": "2026-01-01",
      "to": "2026-01-31",
      "currency": "USD"
    },
    "summary": {
      "totalIncomeCents": 500000,
      "totalExpensesCents": 150000,
      "totalPurchasesCents": 100000,
      "netProfitCents": 250000
    },
    "breakdown": {
      "incomeBySource": [
        {
          "source": "BOOKING",
          "totalCents": 450000,
          "count": 15
        },
        {
          "source": "MANUAL",
          "totalCents": 50000,
          "count": 3
        }
      ],
      "expensesByCategory": [
        {
          "categoryId": "uuid-1234",
          "categoryName": "Utilities",
          "totalCents": 75000,
          "count": 8
        },
        {
          "categoryId": null,
          "categoryName": "Uncategorized",
          "totalCents": 75000,
          "count": 5
        }
      ],
      "purchasesByVendor": [
        {
          "vendorName": "Acme Corp",
          "totalCents": 60000,
          "count": 4
        },
        {
          "vendorName": "Widget Inc",
          "totalCents": 40000,
          "count": 2
        }
      ]
    }
  }
}
```

### Summary Response (GET `/profit-loss/summary`)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "filters": {
      "from": "2026-01-01",
      "to": "2026-01-31",
      "currency": "USD"
    },
    "summary": {
      "totalIncomeCents": 500000,
      "totalExpensesCents": 150000,
      "totalPurchasesCents": 100000,
      "netProfitCents": 250000
    }
  }
}
```

**Note:** The `/summary` endpoint never includes `breakdown` in the response.

### Error Responses

**400 Bad Request** (Invalid date format):
```json
{
  "success": false,
  "error": "Invalid from date. Expected ISO format (YYYY-MM-DD)"
}
```

**400 Bad Request** (Invalid date range):
```json
{
  "success": false,
  "error": "From date must be before or equal to to date"
}
```

**400 Bad Request** (Invalid currency):
```json
{
  "success": false,
  "error": "Currency must be a 3-character code (e.g., USD, EUR)"
}
```

**401 Unauthorized** (Missing or invalid token):
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden** (Insufficient permissions):
```json
{
  "success": false,
  "error": "Admin access required"
}
```

### Response with `includeBreakdown=false`

```json
{
  "success": true,
  "data": {
    "filters": {
      "from": null,
      "to": null,
      "currency": null
    },
    "summary": {
      "totalIncomeCents": 500000,
      "totalExpensesCents": 150000,
      "totalPurchasesCents": 100000,
      "netProfitCents": 250000
    }
  }
}
```

## Business Rules

### Soft Delete
- All queries respect soft delete (`deletedAt: null`)
- Only active (non-deleted) records are included in calculations

### Date Fields
Each model uses its specific date field for filtering:
- **Income:** `dateReceived` - When the payment was received
- **Expenses:** `date` - Expense occurrence date
- **Purchases:** `purchaseDate` - Purchase transaction date

### Amount Fields
All amounts are in **cents** (smallest currency unit):
- **Income:** `amount` field
- **Expenses:** `amount` field
- **Purchases:** `amount` field

### Currency Filtering
- **Income:** Supports currency filter via `currency` field
- **Expenses:** No currency field (assumed base currency)
- **Purchases:** Supports currency filter via `currency` field

### Net Profit Calculation

```
Net Profit = Total Income - Total Expenses - Total Purchases
```

Where:
- **Total Income**: Sum of all income records matching filters
- **Total Expenses**: Sum of all expense records matching filters
- **Total Purchases**: Sum of all purchase records matching filters (representing payables)

## Example Requests

### 1. Get Full P&L for Current Month

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Get P&L Summary Only

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss/summary?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Get P&L for USD Only

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?currency=USD" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Get Summary Only (No Breakdown)

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?includeBreakdown=false" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 5. Get P&L for Entire Year with All Details

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-12-31&includeBreakdown=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Testing

### Prerequisites
- Server running on `http://localhost:5001`
- Valid ADMIN or SUPER_ADMIN JWT token
- Sample data in Income, Expense, and Purchase tables

### Run Tests

**Node.js:**
```bash
TEST_TOKEN=your_jwt_token node test-profit-loss.js
```

**PowerShell:**
```powershell
$env:TEST_TOKEN='your_jwt_token'
.\test-profit-loss.ps1
```

### Test Coverage

The test scripts cover:
1. ✅ Basic P&L retrieval (no filters)
2. ✅ P&L with date range filtering
3. ✅ P&L with currency filter
4. ✅ P&L without breakdown (`includeBreakdown=false`)
5. ✅ P&L with all filters combined
6. ✅ Summary endpoint (`/summary` route)
7. ✅ Invalid date format validation (400 error)
8. ✅ Invalid date range validation (400 error)

## Implementation Details

### Service Layer
- **File:** `src/modules/finance/profitLoss/profitLoss.service.js`
- **Function:** `computeProfitAndLoss(filters)`
- Uses Prisma `aggregate` and `groupBy` for efficient database queries
- Parallel execution for income, expense, and purchase totals
- Optimized category name resolution for expenses

### Controller Layer
- **File:** `src/modules/finance/profitLoss/profitLoss.controller.js`
- **Function:** `getProfitAndLoss(req, res)`
- Query parameter parsing and validation
- Consistent with other finance controllers

### Routes
- **File:** `src/modules/finance/profitLoss/profitLoss.routes.js`
- **Mount Point:** `/finance/profit-loss` (via `finance.routes.js`)
- Protected by `authRequired` and `requireAdmin` middleware

## Data Models

### Income Model
```prisma
model Income {
  amount       Int          // Amount in cents
  currency     String       @default("USD")
  dateReceived DateTime     @default(now())
  source       IncomeSource // BOOKING, MANUAL, OTHER
  deletedAt    DateTime?    // Soft delete
}
```

### Expense Model
```prisma
model Expense {
  amount     Int           // Amount in cents
  date       DateTime      @default(now())
  categoryId String?       // Optional category reference
  deletedAt  DateTime?     // Soft delete
}
```

### Purchase Model
```prisma
model Purchase {
  amount       Int            // Amount in cents
  currency     String         @default("USD")
  purchaseDate DateTime
  vendorName   String
  deletedAt    DateTime?      // Soft delete
}
```

## Notes

- All date filters are **inclusive** (both start and end dates are included)
- Breakdown arrays are sorted by `totalCents` descending (highest amounts first)
- Empty breakdowns return empty arrays, not null
- If no records match filters, totals will be 0
- Currency filter only affects Income and Purchases (Expenses don't have currency field)

## Future Enhancements (V2+)

Potential features for future versions:
- Group by time period (monthly, quarterly, yearly)
- Profit margins and percentage calculations
- Trend analysis and comparisons
- Export to CSV/Excel
- Multi-currency normalization
- Expense subcategory breakdown
- Agent commission impact on net profit
