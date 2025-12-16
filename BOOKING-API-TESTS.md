# DAY 1 - STEP 4: Booking APIs - Manual Test Guide

## ✅ Implementation Complete

### API Endpoints Implemented

1. **POST /api/bookings** - Create a booking (PUBLIC - no auth)
2. **GET /api/bookings** - Get all bookings (Auth required, role-based filtering)
3. **GET /api/bookings/:id** - Get booking by ID (Auth required, access control)
4. **PATCH /api/bookings/:id/status** - Update booking status (ADMIN/AGENT only)

---

## 🧪 Manual Testing Steps

### Prerequisites
- Server running on http://localhost:5001
- Use Thunder Client, Postman, or curl
- Have admin credentials: admin@soulter.com / admin123
- Have agent credentials: agent@soulter.com / agent123

---

### Test 1: Login as ADMIN

**Request:**
```http
POST http://localhost:5001/api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@soulter.com",
  "password": "admin123"
}
```

**Expected Response:** 200 OK
- Save the `auth_token` cookie for subsequent requests

---

### Test 2: Create a Glamp (ADMIN only)

**Request:**
```http
POST http://localhost:5001/api/glamps
Cookie: auth_token=<your_admin_token>
Content-Type: application/json

{
  "name": "Luxury Safari Tent",
  "description": "Beautiful tent with mountain views",
  "pricePerNight": 15000,
  "maxGuests": 4,
  "status": "ACTIVE"
}
```

**Expected Response:** 201 Created
- Save the `id` from response (UUID format)

---

### Test 3: Create a Booking (PUBLIC - no auth required)

**Request:**
```http
POST http://localhost:5001/api/bookings
Content-Type: application/json

{
  "customerName": "Alice Johnson",
  "customerEmail": "alice@example.com",
  "glampId": "<glamp_uuid_from_test_2>",
  "checkInDate": "2025-12-25T14:00:00.000Z",
  "checkOutDate": "2025-12-28T11:00:00.000Z",
  "numberOfGuests": 2
}
```

**Expected Response:** 201 Created
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "uuid",
    "customerId": "uuid",
    "glampId": "uuid",
    "checkInDate": "2025-12-25T14:00:00.000Z",
    "checkOutDate": "2025-12-28T11:00:00.000Z",
    "totalAmount": 45000,  // 3 nights × $150 = $450 (in cents)
    "status": "PENDING",
    "customer": {
      "id": "uuid",
      "name": "Alice Johnson",
      "email": "alice@example.com"
    },
    "glamp": {
      "id": "uuid",
      "name": "Luxury Safari Tent",
      "pricePerNight": 15000
    }
  }
}
```

**Key Points:**
- ✅ CUSTOMER user created dynamically (no login required)
- ✅ Price calculated: 3 nights × $150 = $450
- ✅ Status defaulted to PENDING

---

### Test 4: Get All Bookings (ADMIN)

**Request:**
```http
GET http://localhost:5001/api/bookings
Cookie: auth_token=<your_admin_token>
```

**Expected Response:** 200 OK
- Admin sees ALL bookings in the system

---

### Test 5: Get Booking by ID (ADMIN)

**Request:**
```http
GET http://localhost:5001/api/bookings/<booking_uuid>
Cookie: auth_token=<your_admin_token>
```

**Expected Response:** 200 OK
- Full booking details returned

---

### Test 6: Update Booking Status (ADMIN)

**Request:**
```http
PATCH http://localhost:5001/api/bookings/<booking_uuid>/status
Cookie: auth_token=<your_admin_token>
Content-Type: application/json

{
  "status": "CONFIRMED"
}
```

**Expected Response:** 200 OK
```json
{
  "success": true,
  "message": "Booking status updated successfully",
  "data": {
    "status": "CONFIRMED",
    ...
  }
}
```

**Allowed Transitions:**
- ✅ PENDING → CONFIRMED
- ✅ PENDING → CANCELLED
- ✅ CONFIRMED → CANCELLED
- ✅ CONFIRMED → COMPLETED
- ❌ CONFIRMED → PENDING (invalid)
- ❌ CANCELLED → anything (invalid)
- ❌ COMPLETED → anything (invalid)

---

### Test 7: Test Invalid Transition

**Request:**
```http
PATCH http://localhost:5001/api/bookings/<booking_uuid>/status
Cookie: auth_token=<your_admin_token>
Content-Type: application/json

{
  "status": "PENDING"
}
```

**Expected Response:** 400 Bad Request
```json
{
  "success": false,
  "error": "Cannot transition from CONFIRMED to PENDING"
}
```

---

### Test 8: Login as AGENT

**Request:**
```http
POST http://localhost:5001/api/auth/agent/login
Content-Type: application/json

{
  "email": "agent@soulter.com",
  "password": "agent123"
}
```

**Expected Response:** 200 OK
- Save the `auth_token` cookie

---

### Test 9: Get All Bookings as AGENT

**Request:**
```http
GET http://localhost:5001/api/bookings
Cookie: auth_token=<your_agent_token>
```

**Expected Response:** 200 OK
- Agent sees ONLY bookings where they are assigned as `agentId`
- Should return 0 bookings (unless agent was assigned during creation)

---

### Test 10: Create Booking with Agent Referral

**Request:**
```http
POST http://localhost:5001/api/bookings
Content-Type: application/json

{
  "customerName": "Bob Wilson",
  "customerEmail": "bob@example.com",
  "glampId": "<glamp_uuid>",
  "checkInDate": "2026-01-10T14:00:00.000Z",
  "checkOutDate": "2026-01-15T11:00:00.000Z",
  "numberOfGuests": 3,
  "agentId": "<agent_uuid_from_seed>"
}
```

**Expected Response:** 201 Created
- Booking created with `agentId` populated
- Agent can now see this booking when calling GET /api/bookings

---

## 🎯 Key Implementation Features

### ✅ Dynamic CUSTOMER Creation
- CUSTOMER users are created automatically during booking
- No login/password required (business entities)
- Email is unique constraint - reuses existing CUSTOMER if email matches

### ✅ Price Calculation
- `totalAmount = pricePerNight × number_of_nights`
- Calculated automatically from check-in/check-out dates
- Stored in smallest currency unit (cents)

### ✅ Role-Based Access
- **PUBLIC**: Can create bookings (no auth)
- **CUSTOMER**: See only their own bookings
- **AGENT**: See only bookings assigned to them
- **ADMIN/SUPER_ADMIN**: See all bookings

### ✅ Status Lifecycle
```
PENDING → CONFIRMED → COMPLETED
    ↓         ↓
CANCELLED  CANCELLED
```

### ✅ Commission Trigger
- When status changes to CONFIRMED or COMPLETED
- Commission created automatically if `agentId` is present
- 20% of `totalAmount`

---

## 📊 Database State After Tests

After running all tests, your database should have:

1. **Users Table:**
   - 3 system users (SUPER_ADMIN, ADMIN, AGENT)
   - 2+ CUSTOMER users (Alice, Bob, etc.)

2. **Glamps Table:**
   - 1+ glamp(s) created by ADMIN

3. **Bookings Table:**
   - 2+ bookings with different statuses

4. **Commissions Table:**
   - 0-1 commission records (if agent-referred booking was confirmed)

---

## 🚀 Next Steps

After validating all endpoints work:
- [ ] Move to Day 1 Step 5 (if applicable)
- [ ] Or proceed with additional features
- [ ] Frontend integration testing

---

## 🔍 Verification Queries

Run these in your PostgreSQL client to verify data:

```sql
-- Check all users
SELECT id, name, email, role FROM "User" ORDER BY role, name;

-- Check all bookings
SELECT 
  b.id,
  c.name as customer_name,
  g.name as glamp_name,
  b."checkInDate",
  b."checkOutDate",
  b."totalAmount",
  b.status
FROM "Booking" b
JOIN "User" c ON b."customerId" = c.id
JOIN "Glamp" g ON b."glampId" = g.id;

-- Check commissions
SELECT 
  cm.id,
  a.name as agent_name,
  cm.amount,
  b.status as booking_status
FROM "Commission" cm
JOIN "User" a ON cm."agentId" = a.id
JOIN "Booking" b ON cm."bookingId" = b.id;
```
