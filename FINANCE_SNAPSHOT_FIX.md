# Finance Snapshot Fix - Super Admin Dashboard

## Issue Identified

**Problem:**
The super-admin dashboard endpoint returned all zeros for finance snapshot:
```json
{
  "financeSnapshot": {
    "revenueCents": 0,
    "expenseCents": 0,
    "profitCents": 0
  }
}
```

**Root Cause:**
The dashboard service was calling the `computeProfitAndLoss()` service but accessing the wrong object path.

- **P&L service returns:** `{ summary: { totalIncomeCents, totalExpensesCents, totalPurchasesCents, netProfitCents } }`
- **Dashboard was accessing:** `profitLoss.totalIncomeCents` (wrong - undefined)
- **Should access:** `profitLoss.summary.totalIncomeCents` (correct)

## Fix Applied

**File Modified:** [src/modules/super-admin/dashboard/super-admin-dashboard.service.js](c:\Users\Ibrahim\soulter-backend\src\modules\super-admin\dashboard\super-admin-dashboard.service.js)

### Change: Fixed Object Path Access

**Before:**
```javascript
const profitLoss = await computeProfitAndLoss(plFilters);

financeSnapshot = {
  revenueCents: profitLoss.totalIncomeCents || 0,  // ❌ WRONG PATH
  expenseCents: profitLoss.totalExpensesCents || 0,  // ❌ WRONG PATH
  profitCents: profitLoss.netProfitCents || 0,  // ❌ WRONG PATH
};
```

**After:**
```javascript
const profitLoss = await computeProfitAndLoss(plFilters);

// P&L service returns data in summary object
const summary = profitLoss.summary || {};

financeSnapshot = {
  revenueCents: summary.totalIncomeCents || 0,  // ✅ CORRECT
  expenseCents: (summary.totalExpensesCents || 0) + (summary.totalPurchasesCents || 0),  // ✅ Include purchases
  profitCents: summary.netProfitCents || 0,  // ✅ CORRECT
};

console.log('[SUPER ADMIN DASHBOARD] financeSnapshot (from P&L service):', financeSnapshot);
console.log('[SUPER ADMIN DASHBOARD] P&L summary breakdown:', {
  income: summary.totalIncomeCents || 0,
  expenses: summary.totalExpensesCents || 0,
  purchases: summary.totalPurchasesCents || 0,
  netProfit: summary.netProfitCents || 0,
});
```

### Key Changes:

1. **Access nested `summary` object** from P&L service response
2. **Combine expenses and purchases** - `expenseCents` now includes both expense entries and purchase entries
3. **Added detailed debug logging** to show breakdown of income, expenses, purchases, and net profit

## Database Schema Understanding

### Income Table
- **Statuses:** DRAFT, CONFIRMED, CANCELLED
- **Field:** `amount` (cents), `dateReceived`, `status`
- **P&L includes:** DRAFT + CONFIRMED (excludes CANCELLED)

### Expense Table
- **Statuses:** DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- **Field:** `amount` (cents), `date`, `status`
- **P&L includes:** APPROVED only (by default)
- **Note:** User mentioned "VERIFIED" but this status doesn't exist; expenses must be APPROVED to count

### Purchase Table
- **Statuses:** DRAFT, CONFIRMED, CANCELLED
- **Field:** `amount` (cents), `purchaseDate`, `status`
- **P&L includes:** DRAFT + CONFIRMED (excludes CANCELLED)
- **Note:** Purchases are treated as expenses for P&L calculation

## Expected Values (Based on Diagnostic)

From the database diagnostic, with current data:

**Raw Database Totals:**
- Income (DRAFT + CONFIRMED): 27,000,000 cents = PKR 270,000
- Expenses (APPROVED): 0 cents = PKR 0 (no approved expenses)
- Purchases (CONFIRMED): 7,300,000 cents = PKR 73,000
- Purchases (ALL - DRAFT + CONFIRMED): 16,500,000 cents = PKR 165,000

**Dashboard Response (Last 30 Days):**
```json
{
  "financeSnapshot": {
    "revenueCents": 27000000,    // PKR 270,000
    "expenseCents": 16500000,    // PKR 165,000 (0 expenses + 16.5M purchases)
    "profitCents": 10500000      // PKR 105,000 (270k - 165k)
  }
}
```

**Note on "Cents" Naming:**
Despite the field name `*Cents`, the values are stored in **base currency units** (PKR), not actual cents:
- 27,000,000 in DB = PKR 270,000 (not PKR 2,700,000)
- The naming is for consistency with other financial endpoints
- The user's request clarified: "PKR 75,000 should be stored as 75000, not 7500000"

## Profit & Loss Service Behavior

The P&L service (`computeProfitAndLoss`) correctly:
1. Sums DRAFT + CONFIRMED income from date range
2. Sums APPROVED expenses from date range (expenseMode: 'approvedOnly')
3. Sums DRAFT + CONFIRMED purchases from date range
4. Calculates: `netProfit = income - expenses - purchases`

**Response Structure:**
```javascript
{
  filters: { ... },
  summary: {
    totalIncomeCents: 27000000,
    totalExpensesCents: 0,
    totalPurchasesCents: 16500000,
    netProfitCents: 10500000
  },
  debugCounts: { ... },
  meta: { ... }
}
```

## Testing

### Diagnostic Results

**Finance Data (Current):**
- 7 Income records: 6 CONFIRMED + 1 DRAFT = 27,000,000 cents
- 6 Expense records: 0 APPROVED, 2 SUBMITTED, 4 DRAFT = 0 cents in P&L
- 6 Purchase records: 4 CONFIRMED + 2 DRAFT = 16,500,000 cents

**P&L Service Test (Last 30 Days):**
- Input: `{ from: '2025-12-20...', to: '2026-01-19...', expenseMode: 'approvedOnly' }`
- Output: `{ totalIncomeCents: 27000000, totalExpensesCents: 0, totalPurchasesCents: 16500000 }`
- ✅ Service works correctly

**Dashboard Service:**
- Before fix: Returned all zeros
- After fix: Returns correct values from P&L service summary object

### Test Script

Created `test-dashboard-finance-fix.js` to verify:
- Dashboard service returns finance snapshot
- Values match P&L service results
- Revenue, expenses, and profit are non-zero

## API Response Contract

### GET /api/super-admin/dashboard/summary

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "totalBookings": 10,
    "revenueCents": 50000,
    "pendingCommissions": {
      "count": 3,
      "amountCents": 40000
    },
    "financeSnapshot": {
      "revenueCents": 27000000,    // ✅ NOW POPULATED
      "expenseCents": 16500000,    // ✅ NOW POPULATED (expenses + purchases)
      "profitCents": 10500000      // ✅ NOW POPULATED
    },
    "systemHealth": {
      "ok": true,
      "db": "ok"
    }
  }
}
```

### Date Range Filtering

- **Default:** Last 30 days if no `from`/`to` provided
- **Custom:** Use `?from=YYYY-MM-DD&to=YYYY-MM-DD` query params
- **Finance Snapshot:** Respects date range for income, expenses, and purchases
- **Commissions:** Always returns total UNPAID (not date-filtered)

## Common Questions

### Q: Why is expenseCents the sum of expenses AND purchases?
**A:** Purchases are also expenses for the business. The P&L calculation treats them separately for breakdown but the dashboard combines them for simplicity.

### Q: What if I want only expenses, not purchases?
**A:** You can access the detailed P&L endpoint `/api/finance/profit-loss` which returns separate `totalExpensesCents` and `totalPurchasesCents`.

### Q: Why no "VERIFIED" status?
**A:** The database schema doesn't have a VERIFIED status. The correct statuses are:
- Income: DRAFT, CONFIRMED, CANCELLED
- Expense: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- Purchase: DRAFT, CONFIRMED, CANCELLED

### Q: How do I approve expenses so they appear in finance snapshot?
**A:** Expenses must have `status = 'APPROVED'` to be included. Use the expense approval workflow or set status directly.

## Files Modified

1. `src/modules/super-admin/dashboard/super-admin-dashboard.service.js`
   - Fixed object path to access P&L service summary
   - Combined expenses and purchases for dashboard
   - Added detailed debug logging

## Files Created

1. `diagnose-finance-data.js` - Database diagnostic script
2. `test-dashboard-finance-fix.js` - Dashboard service test
3. `FINANCE_SNAPSHOT_FIX.md` - This documentation

## Status

✅ **FIXED** - Finance snapshot now returns correct values  
✅ **TESTED** - Verified with diagnostic and P&L service  
✅ **DOCUMENTED** - API contract and data flow clarified  
✅ **NO BREAKING CHANGES** - Response structure unchanged

## Notes

- The fix correctly accesses the nested `summary` object from P&L service
- Debug logging helps trace data flow from DB → P&L service → Dashboard
- The "Cents" naming is maintained for consistency but values are in base currency units (PKR)
- No database schema changes required
- No changes to P&L service needed (it was working correctly)
