# Super Admin Commissions API - Quick Start Guide

## 🚀 What Was Implemented

A complete Super Admin Commissions module with 4 endpoints:

1. **GET** `/api/super-admin/commissions` - List all commissions with advanced filtering
2. **GET** `/api/super-admin/commissions/:id` - Get commission details
3. **POST** `/api/super-admin/commissions/:id/mark-paid` - Mark commission as paid
4. **POST** `/api/super-admin/commissions/:id/mark-unpaid` - Revert to unpaid

## 📁 Files Created

```
src/modules/super-admin/commissions/
├── super-admin-commissions.service.js       # Business logic & database operations
├── super-admin-commissions.controller.js    # Request handling & validation
└── super-admin-commissions.routes.js        # Route definitions

src/routes/
└── super-admin.routes.js                    # Updated to include commissions routes

Root directory:
├── test-super-admin-commissions.js          # Node.js test script
├── test-super-admin-commissions.ps1         # PowerShell test script
├── SUPER_ADMIN_COMMISSIONS_API.md          # Comprehensive API documentation
└── SUPER_ADMIN_COMMISSIONS_QUICK_START.md  # This file
```

## ✅ Features Implemented

### 1. Advanced Filtering
- **Date Range**: Filter by commission creation date (last 30 days default)
- **Status**: Filter by PAID, UNPAID, PENDING, or ALL
- **Agent**: Filter by specific agent UUID
- **Booking**: Filter by specific booking UUID
- **Search**: Search across agent name/email, commission ID, booking ID

### 2. Pagination & Sorting
- Configurable page size (default 20)
- Custom sorting (e.g., `createdAt_desc`, `amount_asc`)
- Full pagination metadata (total, pages, hasNext/hasPrev)

### 3. Real-Time Aggregations
Returns comprehensive statistics:
- Pending count & total amount
- Paid count & total amount
- Overall total amount
- All calculated from filtered dataset

### 4. Payment Management
- **Mark as Paid**: Update commission status with optional metadata (paidAt, note, paymentMethod, reference)
- **Revert to Unpaid**: Rollback PAID commissions with reason tracking
- Idempotent operations (safe to call multiple times)

### 5. Related Data
- Full agent information (name, email)
- Complete booking details (customer, dates, glamp, amount)
- Optimized queries with Prisma includes

## 🔐 Security

- ✅ Protected by SUPER_ADMIN authentication
- ✅ JWT token validation
- ✅ Input validation on all parameters
- ✅ SQL injection protection via Prisma
- ✅ Error handling with detailed logging

## 🧪 Testing

### Option 1: Node.js Test Script

```bash
# Default settings (localhost:5001)
node test-super-admin-commissions.js

# Custom settings
API_URL=http://localhost:5001 \
SUPER_ADMIN_EMAIL=admin@example.com \
SUPER_ADMIN_PASSWORD=YourPassword \
node test-super-admin-commissions.js
```

### Option 2: PowerShell Test Script (Windows)

```powershell
# Default settings
.\test-super-admin-commissions.ps1

# Custom settings
$env:API_URL = "http://localhost:5001"
$env:SUPER_ADMIN_EMAIL = "admin@example.com"
$env:SUPER_ADMIN_PASSWORD = "YourPassword"
.\test-super-admin-commissions.ps1
```

### Option 3: Manual cURL Testing

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"Password123!"}' \
  | jq -r '.token')

# 2. Get all commissions
curl -X GET "http://localhost:5001/api/super-admin/commissions" \
  -H "Authorization: Bearer $TOKEN"

# 3. Get commission by ID
curl -X GET "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID" \
  -H "Authorization: Bearer $TOKEN"

# 4. Mark as paid
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paidAt":"2026-01-15T10:00:00Z","note":"Payment completed","paymentMethod":"TRANSFER","reference":"TXN-12345"}'

# 5. Mark as unpaid
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-unpaid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Payment reversed"}'
```

## 📖 Usage Examples

### Example 1: Get Recent Unpaid Commissions

```bash
GET /api/super-admin/commissions?status=UNPAID&page=1&limit=10&sort=createdAt_desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "meta": { "total": 25, "page": 1, "limit": 10, "totalPages": 3 },
    "aggregates": {
      "pendingCount": 5,
      "pendingAmountCents": 25000,
      "paidCount": 0,
      "paidAmountCents": 0,
      "totalAmountCents": 25000
    }
  }
}
```

### Example 2: Find Commissions for Specific Agent

```bash
GET /api/super-admin/commissions?agentId=agent-uuid-here&from=2026-01-01&to=2026-12-31
```

### Example 3: Search by Agent Name

```bash
GET /api/super-admin/commissions?search=john&limit=20
```

### Example 4: Process Payment

```bash
POST /api/super-admin/commissions/commission-uuid/mark-paid
Content-Type: application/json

{
  "paidAt": "2026-01-15T14:30:00Z",
  "note": "Wire transfer completed",
  "paymentMethod": "TRANSFER",
  "reference": "WIRE-12345"
}
```

## 🏗️ Architecture

The implementation follows your existing project patterns:

```
Routes → Middleware → Controller → Service → Prisma
```

- **Routes**: Define endpoints + apply auth middleware
- **Controller**: Parse requests + format responses
- **Service**: Business logic + database operations

### Key Utilities Reused

✅ `parseDateRange` - Consistent date handling with inclusive end-of-day  
✅ `getPagination` - Skip/take calculation for Prisma  
✅ `getPaginationMeta` - Response metadata  
✅ `asyncHandler` - Error handling wrapper  
✅ `authRequired` + `requireSuperAdmin` - Authentication & authorization  

## 🗄️ Database Schema

Uses existing `Commission` model:

```prisma
model Commission {
  id        String           @id @default(uuid())
  amount    Int              // Cents
  status    CommissionStatus @default(UNPAID)
  agentId   String
  bookingId String           @unique
  createdAt DateTime         @default(now())
  
  agent   User    @relation(...)
  booking Booking @relation(...)
  
  @@index([agentId])
  @@index([bookingId])
  @@index([status])
}

enum CommissionStatus {
  UNPAID
  PAID
}
```

**No schema changes required** - works with existing structure!

## 🔮 Future Enhancements (Optional)

If you want to add payment metadata to the schema:

```prisma
model Commission {
  // ... existing fields ...
  
  paidAt        DateTime?
  paymentMethod String?
  paymentNote   String?
  reference     String?
}
```

Then update `markCommissionAsPaid` service to store these fields.

## 📊 Response Format

All responses follow the standard format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## 🛠️ Troubleshooting

### "Commission not found"
- Verify the commission UUID exists in database
- Check you're using the correct API environment

### "Access denied. Required role(s): SUPER_ADMIN"
- Ensure logged-in user has SUPER_ADMIN role
- Check JWT token is valid and not expired

### "Cannot mark unpaid: commission status is UNPAID"
- Only PAID commissions can be reverted to UNPAID
- This is expected behavior for business logic

### No commissions returned
- Check date range (default is last 30 days)
- Verify commissions exist in database for the filtered period
- Try removing filters to see all commissions

## 📝 Common Queries

**Get all commissions for January 2026:**
```
GET /api/super-admin/commissions?from=2026-01-01&to=2026-01-31
```

**Get paid commissions sorted by amount:**
```
GET /api/super-admin/commissions?status=PAID&sort=amount_desc
```

**Get commissions for specific booking:**
```
GET /api/super-admin/commissions?bookingId=booking-uuid-here
```

**Search all fields:**
```
GET /api/super-admin/commissions?search=searchterm
```

## 📚 Documentation

For complete API documentation, see:
- **[SUPER_ADMIN_COMMISSIONS_API.md](./SUPER_ADMIN_COMMISSIONS_API.md)** - Full API reference with all endpoints, parameters, examples, and error codes

## ✨ Summary

You now have a fully functional Super Admin Commissions API that:

✅ Lists all commissions with powerful filtering  
✅ Provides detailed commission information  
✅ Manages payment status (mark paid/unpaid)  
✅ Returns real-time aggregations  
✅ Follows your existing architecture patterns  
✅ Is fully tested and documented  
✅ Requires no schema changes  

**Ready to use!** 🎉
