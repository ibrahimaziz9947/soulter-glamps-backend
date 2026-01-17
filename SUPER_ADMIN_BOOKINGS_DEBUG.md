# Super Admin Bookings API - Debug Guide

## Issue Report
**Problem**: Frontend shows all zeros and "No bookings found", but dashboard shows 33 bookings exist in the same date range (2025-12-18 to 2026-01-17).

## Root Cause Analysis

### Potential Issues Identified & Fixed

#### 1. ✅ Status Filter Bug
**Problem**: Frontend might send `status: "ALL"` or empty string which would cause no results.

**Fix**: Backend now explicitly ignores 'ALL' and empty status values:
```javascript
if (status && status !== 'ALL' && status.trim() !== '') {
  where.status = status;
}
```

#### 2. ✅ Date Field Consistency
**Verified**: Both dashboard and bookings API use `createdAt` field for filtering, ensuring consistency.

**Backend Logic**:
```javascript
const where = {
  createdAt: {
    gte: dateRange.from,  // Start of day
    lte: dateRange.to,    // End of day
  },
};
```

**Dashboard Logic** (confirmed in service):
```javascript
const bookingWhere = {};
if (Object.keys(dateRange).length > 0) {
  bookingWhere.createdAt = dateRange;
}
```

#### 3. ✅ Date Range Parsing
**Verified**: `parseDateRange` utility properly converts:
- Date strings to full-day boundaries
- `from` → start of day (00:00:00.000)
- `to` → end of day (23:59:59.999)
- Both use inclusive `lte` (<=) for end date

#### 4. ✅ Missing Aggregates
**Added**: Response now includes aggregates matching dashboard structure:
```json
{
  "aggregates": {
    "totalBookings": 33,
    "confirmedCount": 20,
    "pendingCount": 8,
    "cancelledCount": 3,
    "completedCount": 2,
    "revenueCents": 1650000
  }
}
```

#### 5. ✅ Debug Logging
**Added**: Comprehensive logging for development environment:
- Raw query parameters
- Parsed date range (ISO + Date objects)
- WHERE clause before query
- Query results (count + items)
- Computed aggregates

All logs prefixed with `[SUPER ADMIN BOOKINGS]` for easy filtering.

---

## Testing Steps

### Step 1: Backend Verification

#### Run Debug Script (PowerShell)
```powershell
# Set your token
$env:SUPER_ADMIN_TOKEN = "your-super-admin-jwt-token"

# Run debug script
.\debug-bookings-api.ps1
```

#### Run Debug Script (Node.js)
```bash
export SUPER_ADMIN_TOKEN="your-super-admin-jwt-token"
node debug-bookings-api.js
```

#### Expected Output
```
✅ Response received successfully

RESPONSE STRUCTURE:
  success: True
  data.items.length: 20
  data.meta.total: 33
  data.meta.page: 1
  data.meta.limit: 20
  data.meta.totalPages: 2
  data.range.from: 2025-12-18T00:00:00.000Z
  data.range.to: 2026-01-17T23:59:59.999Z

📊 AGGREGATES:
  totalBookings: 33
  confirmedCount: 25
  pendingCount: 5
  cancelledCount: 2
  completedCount: 1
  revenueCents: 1650000

✅ SUCCESS: Total matches dashboard (33)
```

### Step 2: Check Backend Console Logs

When the API is called, you should see detailed logs:

```
[SUPER ADMIN BOOKINGS] Raw query params: { from: '2025-12-18', to: '2026-01-17', page: '1', limit: '20', status: undefined, search: undefined, sort: 'createdAt_desc' }

[SUPER ADMIN BOOKINGS] Parsed date range: {
  from: '2025-12-18T00:00:00.000Z',
  to: '2026-01-17T23:59:59.999Z',
  fromObj: 2025-12-18T00:00:00.000Z,
  toObj: 2026-01-17T23:59:59.999Z
}

[SUPER ADMIN BOOKINGS] Where clause: {
  "createdAt": {
    "gte": "2025-12-18T00:00:00.000Z",
    "lte": "2026-01-17T23:59:59.999Z"
  }
}

[SUPER ADMIN BOOKINGS] Query results: { itemsFound: 20, totalCount: 33 }

[SUPER ADMIN BOOKINGS] Aggregates: {
  totalBookings: 33,
  confirmedCount: 25,
  pendingCount: 5,
  cancelledCount: 2,
  completedCount: 1,
  revenueCents: 1650000
}
```

### Step 3: Verify Using curl/Postman

```bash
curl -X GET "http://localhost:5001/api/super-admin/bookings?from=2025-12-18&to=2026-01-17" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Step 4: Frontend Integration Checklist

#### A. API Client Type Definition
Ensure your frontend API client expects the new response structure:

```typescript
interface BookingsResponse {
  success: boolean;
  data: {
    items: BookingListItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    range: {
      from: string;
      to: string;
    };
    aggregates: {
      totalBookings: number;
      confirmedCount: number;
      pendingCount: number;
      cancelledCount: number;
      completedCount: number;
      revenueCents: number;
    };
  };
}

interface BookingListItem {
  id: string;
  createdAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  customerName: string;
  glampName: string;
  totalAmountCents: number;
  agentId: string | null;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
}
```

#### B. Status Filter Handling
Frontend should NOT send `status: "ALL"` or empty string:

```typescript
// ❌ WRONG - sends empty string
const params = { status: selectedStatus || "" };

// ✅ CORRECT - omits status param when "All"
const params = selectedStatus && selectedStatus !== "ALL" 
  ? { status: selectedStatus }
  : {};
```

#### C. Money Formatting
Use existing money formatter, amounts are already in cents:

```typescript
// ❌ WRONG - double conversion
formatMoney(booking.totalAmountCents / 100);

// ✅ CORRECT - already in cents
formatMoney(booking.totalAmountCents);
```

#### D. Render Aggregates in KPI Cards
```tsx
<KPICard
  title="Total Bookings"
  value={data.aggregates.totalBookings}
/>
<KPICard
  title="Revenue"
  value={formatMoney(data.aggregates.revenueCents)}
/>
<KPICard
  title="Confirmed"
  value={data.aggregates.confirmedCount}
/>
```

#### E. Empty State Handling
```tsx
{data.items.length === 0 ? (
  <EmptyState message="No bookings found" />
) : (
  <BookingsTable items={data.items} />
)}
```

---

## Debugging Frontend (If Issue Persists)

### Add Debug Panel (Development Only)

```tsx
{process.env.NODE_ENV === 'development' && (
  <div className="debug-panel">
    <h3>Debug Info</h3>
    <pre>
      Query Params: {JSON.stringify(queryParams, null, 2)}
      Response: {JSON.stringify({ 
        total: data?.meta?.total,
        items: data?.items?.length,
        aggregates: data?.aggregates
      }, null, 2)}
    </pre>
  </div>
)}
```

### Check Network Tab
1. Open browser DevTools → Network
2. Filter: `bookings`
3. Click the request
4. Check:
   - Request URL and params
   - Response Status (should be 200)
   - Response JSON (should have `aggregates` field)
   - Cookies/Authorization header

### Console Logging
```typescript
useEffect(() => {
  console.log('[BOOKINGS PAGE] Fetching with params:', queryParams);
  
  getSuperAdminBookings(queryParams).then(response => {
    console.log('[BOOKINGS PAGE] Response:', response);
  });
}, [queryParams]);
```

---

## Common Issues & Solutions

### Issue: Still Getting 0 Results

**Check 1**: Is the date range correct?
```javascript
// In browser console or debug panel
console.log('Date range:', { from, to });
// Should be: { from: '2025-12-18', to: '2026-01-17' }
```

**Check 2**: Is status filter interfering?
```javascript
// Temporarily remove status filter
const params = { from, to, page, limit };
// Do NOT include status
```

**Check 3**: Are bookings actually in database?
```sql
-- Run directly in database
SELECT COUNT(*) 
FROM "Booking" 
WHERE "createdAt" >= '2025-12-18 00:00:00' 
  AND "createdAt" <= '2026-01-17 23:59:59';
```

### Issue: Aggregates Missing or Zero

**Check**: Response structure
```javascript
console.log('Has aggregates?', 'aggregates' in data);
console.log('Aggregates:', data.aggregates);
```

If missing, backend might not be updated. Verify:
```bash
git pull origin main
npm install
# Restart server
```

### Issue: Money Values Wrong

**Verify**: Values are in cents (integers)
```javascript
// Should be: 165000 (for $1,650.00)
// NOT: 1650.00
console.log('Revenue (cents):', data.aggregates.revenueCents);
```

---

## Verification Checklist

- [ ] Backend returns `data.aggregates` object
- [ ] `data.aggregates.totalBookings` equals `data.meta.total`
- [ ] `data.items.length` <= `data.meta.limit`
- [ ] Backend console shows `[SUPER ADMIN BOOKINGS]` logs
- [ ] Total matches dashboard (or difference is explained)
- [ ] All money values are integers (cents)
- [ ] Status filter 'ALL' returns all bookings
- [ ] Date range matches exactly (check ISO strings)
- [ ] Frontend receives response successfully (200 status)
- [ ] Frontend renders KPI cards from aggregates
- [ ] Frontend renders table rows from items
- [ ] Empty state only shows when `items.length === 0`

---

## Files Modified

### Backend
1. `src/modules/super-admin/bookings/super-admin-bookings.controller.js`
   - Added debug logging
   - Fixed status filter handling (ignores 'ALL')
   - Added aggregates computation
   - Enhanced response structure

### Testing Scripts
1. `debug-bookings-api.ps1` - PowerShell debug script
2. `debug-bookings-api.js` - Node.js debug script
3. `debug-bookings-curl.sh` - Curl commands

### Documentation
1. `SUPER_ADMIN_BOOKINGS_API.md` - Updated with aggregates
2. `SUPER_ADMIN_BOOKINGS_DEBUG.md` - This file

---

## Next Steps

1. **Test backend endpoint directly** using provided scripts
2. **Check server console logs** for debug output
3. **Verify response structure** includes aggregates
4. **Update frontend types** to match new response
5. **Fix frontend rendering** to use aggregates
6. **Remove debug logs** after confirmation (or keep behind env var)

If issues persist after following this guide, provide:
- Backend console logs (with `[SUPER ADMIN BOOKINGS]` prefix)
- Frontend network tab screenshot
- Frontend console logs
- Exact query parameters being sent
