# Profit & Loss V1 Implementation

## Summary

Implemented a comprehensive Profit & Loss (P&L) computation service for the Soulter Glamps backend finance module.

## What Was Created

### 1. Service Layer
**File:** `src/modules/finance/profitLoss/profitLoss.service.js`

- Computes totals from Income, Expense, and Purchase tables
- Respects soft delete (`deletedAt: null`)
- Uses correct date fields per model:
  - Income: `dateReceived`
  - Expenses: `date`
  - Purchases: `purchaseDate`
- Returns amounts in cents
- Supports optional breakdown by source, category, and vendor

### 2. Controller Layer
**File:** `src/modules/finance/profitLoss/profitLoss.controller.js`

- Handles query parameter parsing
- **Date validation**: ISO format (YYYY-MM-DD)
- **Date range validation**: from <= to
- **Currency validation**: 3-character code
- Returns standardized JSON response
- Returns 400 errors for invalid inputs
- Two endpoints:
  - `getProfitAndLoss` - Full P&L with optional breakdown
  - `getProfitAndLossSummary` - Summary only (no breakdown)

### 3. Routes
**File:** `src/modules/finance/profitLoss/profitLoss.routes.js`

- Mounted at `/api/finance/profit-loss`
- Two routes:
  - `GET /` - Full P&L statement
  - `GET /summary` - Summary only
- Protected by `authRequired` and `requireAdmin` middleware
- `/summary` route defined first to avoid route conflicts

### 4. Integration
**Updated:** `src/routes/finance.routes.js`

- Imported and mounted profitLoss routes
- Follows same pattern as income, expenses, purchases

### 5. Tests
- `test-profit-loss.js` - Node.js test script
- `test-profit-loss.ps1` - PowerShell test script

### 6. Documentation
**File:** `src/modules/finance/profitLoss/PROFIT_LOSS_API.md`

- Complete API documentation
- Query parameters
- Response format
- Business rules
- Example requests
- Testing instructions

## API Endpoint

```
GET /api/finance/profit-loss
GET /api/finance/profit-loss/summary
```

### Query Parameters
- `from` - Start date (ISO format)
- `to` - End date (ISO format)
- `currency` - Currency filter (optional)
- `includeBreakdown` - Include detailed breakdown (default: true, ignored in `/summary`)

### Validation
- **Date format**: Must be ISO format (YYYY-MM-DD)
- **Date range**: `from` must be <= `to`
- **Currency**: Must be exactly 3 characters
- Invalid inputs return `400` with descriptive error messages

### Response Structure
```json
{
  "filters": { "from": "...", "to": "...", "currency": "..." },
  "summary": {
    "totalIncomeCents": 0,
    "totalExpensesCents": 0,
    "totalPurchasesCents": 0,
    "netProfitCents": 0
  },
  "breakdown": {
    "incomeBySource": [...],
    "expensesByCategory": [...],
    "purchasesByVendor": [...]
  }
}
```

## Testing

### Node.js
```bash
TEST_TOKEN=your_jwt_token node test-profit-loss.js
```

### PowerShell
```powershell
$env:TEST_TOKEN='your_jwt_token'
.\test-profit-loss.ps1
```

## Key Features

✅ Follows existing finance service patterns  
✅ Two endpoints: full P&L and summary-only  
✅ Respects soft delete everywhere  
✅ Uses correct date fields per model  
✅ Returns amounts in cents  
✅ **Comprehensive date validation** (ISO format, range check)  
✅ **Currency validation** (3-character code)  
✅ **400 errors with clear messages** for invalid inputs  
✅ Efficient Prisma queries (aggregate, groupBy)  
✅ Optional detailed breakdown  
✅ Currency filtering support  
✅ Date range filtering  
✅ Comprehensive error handling  
✅ Full test coverage (8 test cases)  
✅ Complete documentation  

## Net Profit Formula

```
Net Profit = Total Income - Total Expenses - Total Purchases
```

## Files Created/Modified

### Created:
1. `src/modules/finance/profitLoss/profitLoss.service.js`
2. `src/modules/finance/profitLoss/profitLoss.controller.js`
3. `src/modules/finance/profitLoss/profitLoss.routes.js`
4. `src/modules/finance/profitLoss/PROFIT_LOSS_API.md`
5. `test-profit-loss.js`
6. `test-profit-loss.ps1`
7. `PROFIT_LOSS_V1_IMPLEMENTATION.md` (this file)

### Modified:
1. `src/routes/finance.routes.js` - Added profitLoss routes import and mount

## Next Steps

1. **Start the server** (if not already running):
   ```bash
   npm start
   ```

2. **Get an admin JWT token**:
   ```bash
   # Login as admin user
   curl -X POST http://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"your_password"}'
   ```

3. **Test the P&L endpoint**:
   ```bash
   TEST_TOKEN=your_jwt_token node test-profit-loss.js
   ```

4. **Verify with manual curl**:
   ```bash
   curl -X GET "http://localhost:5001/api/finance/profit-loss" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Implementation Notes

- Follows the exact same patterns as existing finance modules (income, expenses, purchases)
- Uses Prisma aggregate for totals (efficient)
- Uses Prisma groupBy for breakdowns (efficient)
- All queries exclude soft-deleted records
- Amount fields are all in cents (no conversion needed)
- Expense category names are resolved via join (not in groupBy)
- Consistent error handling with existing services
- Matches response format of other summary endpoints
