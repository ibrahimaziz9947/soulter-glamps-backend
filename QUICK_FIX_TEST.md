# 🚀 Quick Start: Test Bookings Fix

## Immediate Testing (5 minutes)

### Step 1: Get Your Token
```powershell
# Login or get existing SUPER_ADMIN token from your auth system
# Then set environment variable:
$env:SUPER_ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 2: Run Debug Script
```powershell
.\debug-bookings-api.ps1
```

### Step 3: Check Output
You should see:
```
📊 AGGREGATES:
  totalBookings: 33  ← Should match dashboard!
  confirmedCount: XX
  ...

✅ SUCCESS: Total matches dashboard (33)
```

### Step 4: Check Server Console
Look for these logs:
```
[SUPER ADMIN BOOKINGS] Query results: { itemsFound: 20, totalCount: 33 }
[SUPER ADMIN BOOKINGS] Aggregates: { totalBookings: 33, ... }
```

---

## If Still Getting Zero Results

### Quick Debug Checklist:
1. ✅ Is backend updated? (git pull, restart server)
2. ✅ Is date range correct? (2025-12-18 to 2026-01-17)
3. ✅ Is token valid? (test with curl)
4. ✅ Do bookings exist in DB?

### Test Directly in Database:
```sql
SELECT COUNT(*) 
FROM "Booking" 
WHERE "createdAt" >= '2025-12-18' 
  AND "createdAt" < '2026-01-18';
```

### Check Without Filters:
```powershell
# Test without date range
Invoke-RestMethod -Uri "http://localhost:5001/api/super-admin/bookings" -Headers @{"Authorization"="Bearer $env:SUPER_ADMIN_TOKEN"} | ConvertTo-Json -Depth 5
```

---

## Frontend Quick Fix

### Priority 1: Fix Status Filter
```typescript
// In your bookings page
const buildQueryParams = () => {
  const params: any = { page, limit };
  
  // ✅ Only add status if not "ALL"
  if (selectedStatus && selectedStatus !== "ALL") {
    params.status = selectedStatus;
  }
  
  // ✅ Only add search if not empty
  if (search?.trim()) {
    params.search = search.trim();
  }
  
  return params;
};
```

### Priority 2: Use Aggregates
```tsx
// Update KPI cards
<div className="kpi-grid">
  <KPICard 
    title="Total Bookings" 
    value={data?.aggregates?.totalBookings || 0}
  />
  <KPICard 
    title="Revenue" 
    value={formatMoney(data?.aggregates?.revenueCents || 0)}
  />
  <KPICard 
    title="Confirmed" 
    value={data?.aggregates?.confirmedCount || 0}
  />
  <KPICard 
    title="Pending" 
    value={data?.aggregates?.pendingCount || 0}
  />
</div>
```

---

## Success Criteria

✅ Backend returns `totalBookings: 33` in aggregates
✅ Backend returns items array with bookings
✅ Server logs show correct WHERE clause
✅ Frontend receives 200 response
✅ Frontend KPI cards show non-zero values
✅ Frontend table shows booking rows

---

## Files to Check

📁 Backend Controller:
`src/modules/super-admin/bookings/super-admin-bookings.controller.js`

📁 Debug Scripts:
- `debug-bookings-api.ps1` (Windows)
- `debug-bookings-api.js` (Node.js)

📁 Documentation:
- `BOOKINGS_BUG_FIX_SUMMARY.md` (Overview)
- `SUPER_ADMIN_BOOKINGS_DEBUG.md` (Detailed guide)

---

## Need Help?

1. Check `SUPER_ADMIN_BOOKINGS_DEBUG.md` for detailed troubleshooting
2. Run debug script and share output
3. Share server logs with `[SUPER ADMIN BOOKINGS]` prefix
4. Check Network tab in browser DevTools
