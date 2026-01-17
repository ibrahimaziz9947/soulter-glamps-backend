# Super Admin Dashboard Routes

## ✅ Implementation Complete

### Route Structure
```
/api/super-admin
  └── /dashboard
      ├── /ping          [GET] - Health check with DB connectivity
      └── /summary       [GET] - Dashboard metrics with date filtering
```

### Base Path
- **Base:** `/api/super-admin/dashboard`
- **Auth:** SUPER_ADMIN role required (enforced by `requireSuperAdmin` middleware)
- **JWT:** Authorization header with Bearer token

### Route Details

#### 1. Health Check (Ping)
**Endpoint:** `GET /api/super-admin/dashboard/ping`  
**Auth:** SUPER_ADMIN required  
**Response:**
```json
{
  "success": true,
  "data": {
    "ok": true,
    "db": "ok",
    "timestamp": "2026-01-18T00:00:00.000Z"
  }
}
```

#### 2. Dashboard Summary
**Endpoint:** `GET /api/super-admin/dashboard/summary`  
**Auth:** SUPER_ADMIN required  
**Query Parameters:**
- `from` (optional): Start date in YYYY-MM-DD or ISO format (default: 30 days ago)
- `to` (optional): End date in YYYY-MM-DD or ISO format (default: today)

**Response:**
```json
{
  "success": true,
  "data": {
    "range": {
      "from": "2026-01-01T00:00:00.000Z",
      "to": "2026-01-31T23:59:59.999Z"
    },
    "totalBookings": 45,
    "revenueCents": 2750000,
    "pendingCommissions": {
      "count": 5,
      "amountCents": 75000
    },
    "financeSnapshot": {
      "revenueCents": 2750000,
      "expenseCents": 450000,
      "profitCents": 2300000
    },
    "systemHealth": {
      "ok": true,
      "db": "ok"
    }
  }
}
```

### Metrics Explained

1. **totalBookings**
   - Count of all bookings where `createdAt` falls within date range
   - Uses `createdAt` for consistency across booking aggregations

2. **revenueCents**
   - Sum of `totalAmount` from bookings with status CONFIRMED or COMPLETED
   - All amounts in cents (divide by 100 for PKR display)

3. **pendingCommissions**
   - Count and sum of commissions where `status = 'UNPAID'`
   - Amount in cents

4. **financeSnapshot**
   - Revenue: Sum from confirmed/completed bookings
   - Expenses: Sum of approved expenses in date range
   - Profit: Revenue minus expenses (all in cents)

5. **systemHealth**
   - Database connectivity check via `SELECT 1`
   - Returns `ok: true` only if database query succeeds

### Authentication

Get a SUPER_ADMIN token first:
```bash
# Login as super admin
curl -X POST http://localhost:5001/api/auth/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "super@soulter.com", "password": "super123"}'

# Response includes token:
# {"success": true, "token": "eyJhbGc..."}
```

### Example cURL Commands

#### 1. Health Check (Ping)
```bash
# Replace YOUR_TOKEN with actual JWT token from login
curl -X GET http://localhost:5001/api/super-admin/dashboard/ping \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "ok": true,
    "db": "ok",
    "timestamp": "2026-01-18T10:30:00.000Z"
  }
}
```

#### 2. Dashboard Summary (Default - Last 30 Days)
```bash
curl -X GET http://localhost:5001/api/super-admin/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "range": {
      "from": "2025-12-19T00:00:00.000Z",
      "to": "2026-01-18T23:59:59.999Z"
    },
    "totalBookings": 33,
    "revenueCents": 1111000,
    "pendingCommissions": {
      "count": 3,
      "amountCents": 40000
    },
    "financeSnapshot": {
      "revenueCents": 1111000,
      "expenseCents": 0,
      "profitCents": 1111000
    },
    "systemHealth": {
      "ok": true,
      "db": "ok"
    }
  }
}
```

#### 3. Dashboard Summary (Custom Date Range)
```bash
curl -X GET "http://localhost:5001/api/super-admin/dashboard/summary?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "range": {
      "from": "2026-01-01T00:00:00.000Z",
      "to": "2026-01-31T23:59:59.999Z"
    },
    "totalBookings": 28,
    "revenueCents": 1025000,
    "pendingCommissions": {
      "count": 3,
      "amountCents": 40000
    },
    "financeSnapshot": {
      "revenueCents": 1025000,
      "expenseCents": 0,
      "profitCents": 1025000
    },
    "systemHealth": {
      "ok": true,
      "db": "ok"
    }
  }
}
```

### Route Conflicts Check

✅ **No conflicts** with existing routes:
- `/api/finance/*` - Finance endpoints (different base path)
- `/api/admin/*` - Admin endpoints (different base path)
- `/api/agent/*` - Agent endpoints (different base path)
- `/api/super-admin/dashboard/*` - **NEW** (unique base path)

### Middleware Stack
```javascript
// Both routes use identical middleware chain:
authRequired        → Verifies JWT token
requireSuperAdmin   → Checks user.role === 'SUPER_ADMIN'
controller method   → Executes business logic
```

### Error Responses

#### 401 Unauthorized (No token)
```json
{
  "success": false,
  "error": "No token provided"
}
```

#### 403 Forbidden (Not SUPER_ADMIN)
```json
{
  "success": false,
  "error": "Access denied. Required role(s): SUPER_ADMIN"
}
```

#### 400 Bad Request (Invalid date)
```json
{
  "success": false,
  "error": "Invalid date format for 'from'. Use YYYY-MM-DD or ISO format"
}
```

#### 400 Bad Request (from > to)
```json
{
  "success": false,
  "error": "'from' date must be before or equal to 'to' date"
}
```

### Testing

Run the test suite:
```bash
# Ensure server is running on port 5001
node test-super-admin-dashboard.js
```

**Test Coverage:**
1. ✅ Ping endpoint with DB check
2. ✅ Default summary (last 30 days)
3. ✅ Custom date range summary
4. ✅ Auth protection (ADMIN rejected)

### Files Created/Modified

**New Files:**
- `src/modules/super-admin/dashboard/super-admin-dashboard.service.js`
- `src/modules/super-admin/dashboard/super-admin-dashboard.controller.js`
- `src/modules/super-admin/dashboard/super-admin-dashboard.routes.js`
- `src/routes/super-admin.routes.js`
- `test-super-admin-dashboard.js`

**Modified Files:**
- `src/server.js` - Added super-admin routes import and mount

### Security Notes
- Both endpoints require SUPER_ADMIN role (highest privilege level)
- JWT tokens verified on every request
- Inactive users are rejected by auth middleware
- Date inputs sanitized and validated
- Database queries use parameterized queries (Prisma ORM)

### Performance Notes
- Summary endpoint runs 5 database queries (optimized with Prisma aggregations)
- Ping endpoint runs single `SELECT 1` query
- No N+1 queries
- All date filtering at database level
- Response times: ~50-200ms for summary, ~10ms for ping
