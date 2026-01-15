# Profit & Loss V1 - Quick Start Guide

## Overview
The Profit & Loss endpoint provides a consolidated view of your financial performance by computing totals from Income, Expense, and Purchase records.

## Endpoints

### 1. Full P&L Statement
```
GET /api/finance/profit-loss
```
Returns complete P&L with optional breakdown by source, category, and vendor.

### 2. Summary Only
```
GET /api/finance/profit-loss/summary
```
Returns P&L totals only (no breakdown). Perfect for dashboards and quick overview.

## Quick Examples

### 1. Basic P&L (All Time)
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filters": { "from": null, "to": null, "currency": null },
    "summary": {
      "totalIncomeCents": 1500000,
      "totalExpensesCents": 450000,
      "totalPurchasesCents": 300000,
      "netProfitCents": 750000
    },
    "breakdown": {
      "incomeBySource": [
        { "source": "BOOKING", "totalCents": 1200000, "count": 24 },
        { "source": "MANUAL", "totalCents": 300000, "count": 6 }
      ],
      "expensesByCategory": [
        { "categoryId": "...", "categoryName": "Utilities", "totalCents": 200000, "count": 10 },
        { "categoryId": null, "categoryName": "Uncategorized", "totalCents": 250000, "count": 8 }
      ],
      "purchasesByVendor": [
        { "vendorName": "Acme Corp", "totalCents": 180000, "count": 5 },
        { "vendorName": "Widget Inc", "totalCents": 120000, "count": 3 }
      ]
    }
  }
}
```

### 2. Monthly P&L (January 2026)
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. P&L for Specific Currency
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?currency=USD" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Summary Only (No Breakdown)
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?includeBreakdown=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Or use the dedicated summary endpoint:**
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss/summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (no breakdown):**
```json
{
  "success": true,
  "data": {
    "filters": { "from": null, "to": null, "currency": null },
    "summary": {
      "totalIncomeCents": 1500000,
      "totalExpensesCents": 450000,
      "totalPurchasesCents": 300000,
      "netProfitCents": 750000
    }
  }
}
```

### 5. Quarterly Report (Q1 2026)
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-03-31&currency=USD" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Understanding the Response

### Filters
Shows the applied filters for transparency:
```json
{
  "from": "2026-01-01",
  "to": "2026-01-31",
  "currency": "USD"
}
```

### Summary
Total amounts and net profit (all in cents):
```json
{
  "totalIncomeCents": 1500000,      // $15,000.00
  "totalExpensesCents": 450000,     // $4,500.00
  "totalPurchasesCents": 300000,    // $3,000.00
  "netProfitCents": 750000          // $7,500.00
}
```

**Formula:**
```
Net Profit = Income - Expenses - Purchases
750,000 = 1,500,000 - 450,000 - 300,000
```

### Breakdown (Optional)

**Income by Source:**
- Groups income records by source (BOOKING, MANUAL, OTHER)
- Shows total amount and count per source

**Expenses by Category:**
- Groups expenses by category
- Includes category name
- Shows "Uncategorized" for expenses without a category

**Purchases by Vendor:**
- Groups purchases by vendor name
- Shows total amount and count per vendor

## Converting Cents to Dollars

All amounts are in cents. To convert to dollars:

```javascript
const dollars = cents / 100;
// Example: 750000 cents = $7,500.00
```

## Date Filtering

### Important Notes:
- Dates are in ISO format: `YYYY-MM-DD`
- Both `from` and `to` dates are **inclusive**
- Each model uses its specific date field:
  - **Income**: `dateReceived` (when payment was received)
  - **Expenses**: `date` (expense occurrence date)
  - **Purchases**: `purchaseDate` (purchase date)

### Examples:

**Last 7 days:**
```bash
from=$(date -d '7 days ago' +%Y-%m-%d)
to=$(date +%Y-%m-%d)
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=$from&to=$to" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Current month:**
```bash
from=$(date +%Y-%m-01)
to=$(date +%Y-%m-%d)
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=$from&to=$to" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Previous month:**
```bash
# (Using GNU date)
from=$(date -d 'last month' +%Y-%m-01)
to=$(date -d 'last month' +%Y-%m-%d)
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=$from&to=$to" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing

### Get an Admin Token
First, login to get a JWT token:

```bash
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_password"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

### Run P&L Query
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss" \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

### Using Test Scripts

**Node.js:**
```bash
TEST_TOKEN=$TOKEN node test-profit-loss.js
```

**PowerShell:**
```powershell
$env:TEST_TOKEN = $TOKEN
.\test-profit-loss.ps1
```

## Common Use Cases

### 1. Dashboard Summary Widget
Get a quick overview of all-time performance (fastest query):
```
GET /api/finance/profit-loss/summary
```

### 2. Dashboard with Breakdown
Get overview with detailed breakdown:
```
GET /api/finance/profit-loss?includeBreakdown=true
```

### 3. Monthly Report
Generate a detailed monthly financial report:
```
GET /api/finance/profit-loss?from=2026-01-01&to=2026-01-31
```

### 4. Revenue Analysis
Analyze income sources for a specific period:
```
GET /api/finance/profit-loss?from=2026-01-01&to=2026-03-31
# Check breakdown.incomeBySource
```

### 5. Expense Analysis
Review expenses by category:
```
GET /api/finance/profit-loss?from=2026-01-01&to=2026-03-31
# Check breakdown.expensesByCategory
```

### 6. Vendor Spending
Analyze purchase patterns by vendor:
```
GET /api/finance/profit-loss?from=2026-01-01&to=2026-12-31
# Check breakdown.purchasesByVendor
```

## Tips

1. **Performance**: Use `/summary` endpoint or `includeBreakdown=false` for faster queries when you only need totals
2. **Currency**: Always specify currency filter when working with multi-currency data
3. **Date Ranges**: Use shorter date ranges for more detailed analysis
4. **Soft Delete**: The API automatically excludes deleted records
5. **Empty Results**: If no records match, all totals will be 0 (not null)
6. **Date Validation**: Invalid dates or date ranges return 400 errors with clear messages

## Troubleshooting

### Invalid date error (400)
- Ensure dates are in ISO format: `YYYY-MM-DD`
- Check that `from` date is before or equal to `to` date
- Example error: `"Invalid from date. Expected ISO format (YYYY-MM-DD)"`

### No data returned
- Check that records exist in Income, Expense, and Purchase tables
- Verify date range includes records
- Ensure records are not soft-deleted

### Currency issues
- Income and Purchases support currency filtering
- Expenses don't have currency field (assumed base currency)
- Use currency filter when working with multi-currency setups

### Unauthorized error
- Ensure you're using a valid JWT token
- Token must belong to ADMIN or SUPER_ADMIN user
- Check token hasn't expired

## Related Endpoints

- `/api/finance/profit-loss` - Full P&L with breakdown
- `/api/finance/profit-loss/summary` - P&L totals only (fast)
- `/api/finance/income/summary` - Income-only summary
- `/api/finance/expenses` - Expense listing
- `/api/finance/purchases/summary` - Purchase-only summary
- `/api/finance/payables` - Payables management

## Support

For detailed API documentation, see:
- `src/modules/finance/profitLoss/PROFIT_LOSS_API.md`
- `PROFIT_LOSS_V1_IMPLEMENTATION.md`
