# Profit & Loss V1 - cURL Examples

## Quick Reference

### 1. Summary Only (Fastest - No Breakdown)
Returns totals only, perfect for dashboards and widgets.

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss/summary?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filters": { "from": "2026-01-01", "to": "2026-01-31", "currency": null },
    "summary": {
      "totalIncomeCents": 500000,
      "totalExpensesCents": 150000,
      "totalPurchasesCents": 100000,
      "netProfitCents": 250000
    }
  }
}
```

---

### 2. Full Breakdown
Returns totals plus detailed breakdown by source, category, and vendor.

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-01-31&includeBreakdown=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filters": { "from": "2026-01-01", "to": "2026-01-31", "currency": null },
    "summary": {
      "totalIncomeCents": 500000,
      "totalExpensesCents": 150000,
      "totalPurchasesCents": 100000,
      "netProfitCents": 250000
    },
    "breakdown": {
      "incomeBySource": [
        { "source": "BOOKING", "totalCents": 450000, "count": 15 },
        { "source": "MANUAL", "totalCents": 50000, "count": 3 }
      ],
      "expensesByCategory": [
        { "categoryId": "uuid-1234", "categoryName": "Utilities", "totalCents": 75000, "count": 8 },
        { "categoryId": null, "categoryName": "Uncategorized", "totalCents": 75000, "count": 5 }
      ],
      "purchasesByVendor": [
        { "vendorName": "Acme Corp", "totalCents": 60000, "count": 4 },
        { "vendorName": "Widget Inc", "totalCents": 40000, "count": 2 }
      ]
    }
  }
}
```

---

### 3. Currency Filter
Filter by specific currency (applies to Income and Purchases).

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?currency=USD" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filters": { "from": null, "to": null, "currency": "USD" },
    "summary": {
      "totalIncomeCents": 1200000,
      "totalExpensesCents": 400000,
      "totalPurchasesCents": 250000,
      "netProfitCents": 550000
    },
    "breakdown": { ... }
  }
}
```

---

### 4. All-Time Summary
Get complete financial overview without date filters.

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss/summary" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5. Monthly Report with Currency
Detailed monthly report for specific currency.

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-01-31&currency=USD&includeBreakdown=true" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 6. Quarterly Summary
Quick quarterly totals without breakdown.

```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss/summary?from=2026-01-01&to=2026-03-31&currency=USD" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Important Notes

### ✅ Soft Delete
**All queries automatically exclude soft-deleted records:**
- Income: `deletedAt: null`
- Expenses: `deletedAt: null`
- Purchases: `deletedAt: null`

Only active (non-deleted) records are included in calculations.

### 💰 Amount Values
**All amounts are in cents (smallest currency unit):**
- `totalIncomeCents: 500000` = $5,000.00
- `totalExpensesCents: 150000` = $1,500.00
- `totalPurchasesCents: 100000` = $1,000.00
- `netProfitCents: 250000` = $2,500.00

**To convert to dollars:**
```javascript
const dollars = cents / 100;
// Example: 250000 cents = $2,500.00
```

### 📅 Date Fields Used
Each model uses its specific date field:
- **Income:** `dateReceived` - When payment was received
- **Expenses:** `date` - Expense occurrence date
- **Purchases:** `purchaseDate` - Purchase transaction date

### 💱 Currency Filtering
- **Income:** Supports currency filter (has `currency` field)
- **Expenses:** No currency field (assumed base currency, always included)
- **Purchases:** Supports currency filter (has `currency` field)

---

## Testing Workflow

### Step 1: Get Admin Token
```bash
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_password"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

### Step 2: Test Summary Endpoint
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss/summary" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Step 3: Test Full Breakdown
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?includeBreakdown=true" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Step 4: Test Date Range
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss/summary?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Common Patterns

### Dashboard Widget (Fast)
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss/summary" \
  -H "Authorization: Bearer $TOKEN"
```

### Monthly Financial Report
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

### Revenue Analysis
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-03-31" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.breakdown.incomeBySource'
```

### Expense Breakdown
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-03-31" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.breakdown.expensesByCategory'
```

### Vendor Spending Analysis
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-01-01&to=2026-12-31" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.breakdown.purchasesByVendor'
```

---

## Error Examples

### Invalid Date Format
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=invalid-date" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (400):**
```json
{
  "success": false,
  "error": "Invalid from date. Expected ISO format (YYYY-MM-DD)"
}
```

### Invalid Date Range
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?from=2026-12-31&to=2026-01-01" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (400):**
```json
{
  "success": false,
  "error": "From date must be before or equal to to date"
}
```

### Invalid Currency
```bash
curl -X GET "http://localhost:5001/api/finance/profit-loss?currency=US" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (400):**
```json
{
  "success": false,
  "error": "Currency must be a 3-character code (e.g., USD, EUR)"
}
```
