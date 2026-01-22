# Money Units API Contract

## Overview

This document defines the **standardized monetary value handling** across all Soulter backend API endpoints.

## The Problem We Solved

Previously, there was inconsistency in how monetary values were returned:
- Some endpoints returned "whole PKR" (divided by 100 in backend)
- Some endpoints returned "raw cents" (direct DB values)
- Some endpoints had BOTH (new fields vs legacy *Cents fields with different values)
- Frontend couldn't reliably know which fields were converted
- Result: 100x display errors (showing 28M instead of 282k, or 1,250 instead of 125,000)

## The Solution

**Single Source of Truth**: ALL API endpoints return monetary values EXACTLY as stored in the database.

## Database Storage Format

All monetary amounts in the database are stored as **integers representing the smallest currency unit (cents/paisas)**:

```javascript
// Example DB values:
Booking.totalAmount = 36000      // = PKR 360.00
Income.amount = 3500000           // = PKR 35,000.00
Expense.amount = 3750             // = PKR 37.50
Purchase.amount = 7200000         // = PKR 72,000.00
```

**Currency**: PKR (Pakistan Rupees)
- 1 PKR = 100 paisas
- DB stores in paisas (smallest unit)
- Display in rupees (divide by 100)

## API Response Contract

### Rule 1: Return Raw DB Values

All API endpoints return monetary values WITHOUT any conversion:

```javascript
// ✅ CORRECT (what we do now):
{
  "totalIncome": 3500000,          // Raw DB value
  "totalIncomeCents": 3500000,     // Same value (legacy field name)
  "totalExpenses": 154750,
  "netProfit": 3345250
}

// ❌ WRONG (what we used to do):
{
  "totalIncome": 35000,            // Converted to whole PKR (DB / 100)
  "totalIncomeCents": 3500000,     // Raw cents
  // Frontend confusion: which one is correct?
}
```

### Rule 2: Field Naming

We maintain BOTH new and legacy field names for backward compatibility, but **all contain the same raw DB value**:

```javascript
{
  "totalIncome": 3500000,        // New field name, raw value
  "totalIncomeCents": 3500000,   // Legacy field name, SAME raw value
  "total": 154750,               // Short name, raw value
  "totalAmount": 154750,         // Alt name, SAME raw value
  "amount": 135000,              // Generic name, raw value
  "amountCents": 135000          // Legacy name, SAME raw value
}
```

**Key Point**: The `*Cents` suffix is now **legacy naming only** — it does NOT mean the value is different. All fields return raw DB values.

### Rule 3: Frontend Responsibility

The frontend MUST:
1. Treat ALL monetary values from API as **minor units (cents/paisas)**
2. Divide by 100 for display formatting
3. Never assume a field is already converted

```javascript
// ✅ CORRECT frontend handling:
const apiResponse = {
  totalIncome: 3500000,          // From API
  totalExpenses: 154750,         // From API
};

// Display:
const displayIncome = apiResponse.totalIncome / 100;  // 35,000.00 PKR
const displayExpenses = apiResponse.totalExpenses / 100;  // 1,547.50 PKR

// ❌ WRONG:
const displayIncome = apiResponse.totalIncome;  // Would show 3,500,000 (100x too large!)
```

## API Endpoints Affected

All finance-related endpoints follow this contract:

### 1. Profit & Loss API
**Endpoint**: `GET /api/finance/profit-loss`

```json
{
  "summary": {
    "totalIncome": 3500000,           // Raw DB value (PKR 35,000.00)
    "totalIncomeCents": 3500000,      // Same value
    "totalExpenses": 154750,          // Raw DB value (PKR 1,547.50)
    "totalExpensesCents": 154750,     // Same value
    "totalPurchases": 7200000,        // Raw DB value (PKR 72,000.00)
    "totalPurchasesCents": 7200000,   // Same value
    "netProfit": -3854750,            // Raw DB value (PKR -38,547.50)
    "netProfitCents": -3854750,       // Same value
    "currency": "PKR"
  },
  "incomeBySource": [
    {
      "source": "MANUAL",
      "total": 3500000,               // Raw DB value
      "totalIncome": 3500000,         // Same value
      "count": 1
    }
  ],
  "expensesByCategory": [
    {
      "category": "UTILITIES",
      "total": 154750,                // Raw DB value
      "totalExpenses": 154750,        // Same value
      "count": 1
    }
  ]
}
```

### 2. Finance Dashboard API
**Endpoint**: `GET /api/finance/dashboard`

```json
{
  "totalIncome": 3500000,             // Raw DB value
  "totalIncomeCents": 3500000,        // Same value
  "totalExpenses": 7354750,           // Raw DB value
  "totalExpensesCents": 7354750,      // Same value
  "netProfit": -3854750,              // Raw DB value
  "netProfitCents": -3854750,         // Same value
  "pending": {
    "count": 5,
    "amount": 13500000,               // Raw DB value (PKR 135,000.00)
    "amountCents": 13500000,          // Same value
    "currency": "PKR"
  },
  "recentTransactions": [
    {
      "type": "expense",
      "amount": 3750,                 // Raw DB value (PKR 37.50)
      "amountCents": 3750,            // Same value
      "title": "Collection of Resources"
    }
  ]
}
```

### 3. Income API
**Endpoint**: `GET /api/finance/income`

```json
{
  "data": [ /* ... income records ... */ ],
  "summary": {
    "total": 3500000,                 // Raw DB value
    "totalAmount": 3500000,           // Same value
    "count": 1
  }
}
```

**Endpoint**: `GET /api/finance/income/summary`

```json
{
  "total": 3500000,                   // Raw DB value
  "totalAmount": 3500000,             // Same value
  "totalAmountCents": 3500000,        // Same value
  "totalCount": 1,
  "bySource": {
    "MANUAL": {
      "count": 1,
      "total": 3500000,               // Raw DB value
      "totalAmount": 3500000          // Same value
    }
  }
}
```

### 4. Expense API
**Endpoint**: `GET /api/finance/expenses`

```json
{
  "data": [ /* ... expense records ... */ ],
  "summary": {
    "total": 154750,                  // Raw DB value
    "totalAmount": 154750,            // Same value
    "totalAmountCents": 154750,       // Same value
    "count": 1
  }
}
```

### 5. Super Admin Dashboard API
**Endpoint**: `GET /api/super-admin/dashboard/summary`

```json
{
  "financeSnapshot": {
    "totalIncome": 3500000,           // Raw DB value
    "totalIncomeCents": 3500000,      // Same value
    "totalExpenses": 7354750,         // Raw DB value
    "totalExpensesCents": 7354750,    // Same value
    "netProfit": -3854750,            // Raw DB value
    "netProfitCents": -3854750,       // Same value
    "currency": "PKR"
  }
}
```

## Display Formatting

Frontend should format monetary values consistently:

```javascript
/**
 * Format API monetary value for display
 * @param {number} apiValue - Raw value from API (in cents)
 * @param {string} currency - Currency code (default: 'PKR')
 * @returns {string} Formatted amount (e.g., "PKR 35,000.00")
 */
function formatMoney(apiValue, currency = 'PKR') {
  const wholeCurrency = apiValue / 100;
  return `${currency} ${wholeCurrency.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Usage:
formatMoney(3500000)  // → "PKR 35,000.00"
formatMoney(154750)   // → "PKR 1,547.50"
formatMoney(3750)     // → "PKR 37.50"
```

## Migration Guide

If your frontend code currently reads monetary values from the API:

### Step 1: Identify All Money Fields

Find all places where you use API responses containing:
- `totalIncome`, `totalIncomeCents`
- `totalExpenses`, `totalExpensesCents`
- `netProfit`, `netProfitCents`
- `amount`, `amountCents`
- `total`, `totalAmount`, `totalAmountCents`
- etc.

### Step 2: Add /100 Conversion

For EVERY monetary value from the API, divide by 100 before display:

```javascript
// ❌ BEFORE (wrong):
<div>Total Income: {response.totalIncome}</div>
// Displays: 3500000 (100x too large!)

// ✅ AFTER (correct):
<div>Total Income: PKR {(response.totalIncome / 100).toLocaleString()}</div>
// Displays: PKR 35,000
```

### Step 3: Choose ONE Field

Since both new and legacy fields have the same value, pick one and stick with it:

```javascript
// Option A: Use new field names (recommended)
const income = response.totalIncome / 100;
const expenses = response.totalExpenses / 100;
const profit = response.netProfit / 100;

// Option B: Use legacy *Cents fields (if you prefer)
const income = response.totalIncomeCents / 100;
const expenses = response.totalExpensesCents / 100;
const profit = response.netProfitCents / 100;

// Either works! Both have the same raw DB value.
```

### Step 4: Test Edge Cases

- **Negative values**: `-3854750 / 100 = -38547.50` (loss)
- **Zero values**: `0 / 100 = 0.00`
- **Small values**: `75 / 100 = 0.75` (less than 1 PKR)
- **Large values**: `720000000 / 100 = 7200000.00` (millions)

## Validation & Testing

### Backend Tests

Run the money units regression test:

```bash
node test-raw-values.js
```

Expected output: All endpoints return raw DB values (no conversion).

### Frontend Tests

```javascript
describe('Money Display', () => {
  it('should divide API values by 100 for display', () => {
    const apiResponse = { totalIncome: 3500000 };
    const display = apiResponse.totalIncome / 100;
    expect(display).toBe(35000);  // PKR 35,000.00
  });

  it('should handle negative values (losses)', () => {
    const apiResponse = { netProfit: -3854750 };
    const display = apiResponse.netProfit / 100;
    expect(display).toBe(-38547.50);
  });

  it('should handle zero', () => {
    const apiResponse = { amount: 0 };
    const display = apiResponse.amount / 100;
    expect(display).toBe(0);
  });
});
```

## Troubleshooting

### Symptoms of Wrong Implementation

| Symptom | Cause | Fix |
|---------|-------|-----|
| Values 100x too large (28M instead of 280k) | Frontend not dividing by 100 | Add `/100` before display |
| Values 100x too small (2,823 instead of 282k) | Frontend dividing twice (backend + frontend) | Backend returns raw values now |
| Different values on different pages | Frontend using different fields | Use same field everywhere |
| Inconsistent decimal places | Formatting issue | Use `.toFixed(2)` or `toLocaleString` |

### Debug Checklist

1. ✅ Check DB value directly:
   ```sql
   SELECT amount FROM "Income" WHERE id = 'xxx';
   -- Result: 3500000
   ```

2. ✅ Check API response:
   ```bash
   curl /api/finance/income/summary
   # Should see: "total": 3500000
   ```

3. ✅ Check frontend calculation:
   ```javascript
   console.log(apiResponse.total);        // 3500000
   console.log(apiResponse.total / 100);  // 35000
   ```

4. ✅ Check display:
   ```javascript
   // Should show: PKR 35,000.00
   ```

## Summary

- **Database**: Stores in cents (smallest unit): `3500000`
- **Backend API**: Returns raw DB values: `3500000`
- **Frontend**: Divides by 100 for display: `35,000.00 PKR`

**No conversions in backend. All conversions in frontend.**

This ensures:
- ✅ Consistency across all endpoints
- ✅ No confusion about which fields are converted
- ✅ Easy to debug (backend value = DB value)
- ✅ Frontend has full control over formatting
- ✅ No 100x display errors
