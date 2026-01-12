# Backend Step 1: Role-Based Authentication Testing Guide

## ✅ Setup Complete

### Files Created/Updated:
1. ✅ `prisma/seed.js` - Seeds SUPER_ADMIN, ADMIN, and AGENT users
2. ✅ `src/routes/test.routes.js` - Test routes for role verification
3. ✅ `src/server.js` - All routes registered under `/api`
4. ✅ `src/middleware/auth.js` - JWT authentication (fixed `active` field)
5. ✅ `src/middleware/roles.js` - Role-based authorization
6. ✅ `src/utils/response.js` - Standardized response formatting

### Prisma Schema Verified:
```prisma
enum Role {
  SUPER_ADMIN
  ADMIN
  AGENT
}
```

---

## 🌱 Step 1: Seed the Database

Run the seed script to create test users:

```powershell
npm run seed
```

### Created Users:
| Role         | Email                | Password   | Active |
|--------------|---------------------|------------|--------|
| SUPER_ADMIN  | super@soulter.com   | super123   | ✅     |
| ADMIN        | admin@soulter.com   | admin123   | ✅     |
| AGENT        | agent@soulter.com   | agent123   | ✅     |

---

## 🚀 Step 2: Start the Server

```powershell
npm run dev
```

Server should start on `http://localhost:3000`

---

## 🧪 Step 3: Test Authentication

### Test 1: Login as SUPER_ADMIN

**Request:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "super@soulter.com",
  "password": "super123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Super Admin",
    "email": "super@soulter.com",
    "role": "SUPER_ADMIN"
  }
}
```

### Test 2: Login as ADMIN

**Request:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@soulter.com",
  "password": "admin123"
}
```

### Test 3: Login as AGENT

**Request:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "agent@soulter.com",
  "password": "agent123"
}
```

---

## 🔒 Step 4: Test Role-Based Access

### Test Routes Available:
- `GET /api/test/super-admin` - SUPER_ADMIN only
- `GET /api/test/admin` - SUPER_ADMIN and ADMIN
- `GET /api/test/agent` - SUPER_ADMIN, ADMIN, and AGENT

### Test 4: SUPER_ADMIN Access

**Test all routes with SUPER_ADMIN token:**

```http
GET http://localhost:3000/api/test/super-admin
Authorization: Bearer <SUPER_ADMIN_TOKEN>
```

```http
GET http://localhost:3000/api/test/admin
Authorization: Bearer <SUPER_ADMIN_TOKEN>
```

```http
GET http://localhost:3000/api/test/agent
Authorization: Bearer <SUPER_ADMIN_TOKEN>
```

**Expected:** ✅ All should succeed

---

### Test 5: ADMIN Access

```http
GET http://localhost:3000/api/test/super-admin
Authorization: Bearer <ADMIN_TOKEN>
```
**Expected:** ❌ 403 Forbidden

```http
GET http://localhost:3000/api/test/admin
Authorization: Bearer <ADMIN_TOKEN>
```
**Expected:** ✅ Success

```http
GET http://localhost:3000/api/test/agent
Authorization: Bearer <ADMIN_TOKEN>
```
**Expected:** ✅ Success

---

### Test 6: AGENT Access

```http
GET http://localhost:3000/api/test/super-admin
Authorization: Bearer <AGENT_TOKEN>
```
**Expected:** ❌ 403 Forbidden

```http
GET http://localhost:3000/api/test/admin
Authorization: Bearer <AGENT_TOKEN>
```
**Expected:** ❌ 403 Forbidden

```http
GET http://localhost:3000/api/test/agent
Authorization: Bearer <AGENT_TOKEN>
```
**Expected:** ✅ Success

---

## 📋 Expected Results Summary

| Route                    | SUPER_ADMIN | ADMIN | AGENT |
|--------------------------|-------------|-------|-------|
| `/test/super-admin`      | ✅          | ❌    | ❌    |
| `/test/admin`            | ✅          | ✅    | ❌    |
| `/test/agent`            | ✅          | ✅    | ✅    |
| `/auth/create-user`      | ✅          | ❌    | ❌    |

---

## 🛠️ Testing with cURL

### Login:
```powershell
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"super@soulter.com","password":"super123"}'
```

### Access Protected Route:
```powershell
curl http://localhost:3000/api/test/super-admin `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🐛 Troubleshooting

### Issue: "Account is inactive"
- **Cause:** Using wrong field name (`isActive` instead of `active`)
- **Fixed:** Updated `auth.controller.js` and `auth.js` middleware

### Issue: "Invalid token"
- Check JWT_SECRET in `.env`
- Ensure token is in format: `Bearer <token>`

### Issue: 403 Forbidden
- This is expected for unauthorized roles
- Verify you're using the correct user token for the route

---

## ✅ Verification Checklist

- [ ] Seed script runs successfully
- [ ] SUPER_ADMIN can log in
- [ ] ADMIN can log in
- [ ] AGENT can log in
- [ ] SUPER_ADMIN accesses all test routes
- [ ] ADMIN cannot access SUPER_ADMIN routes
- [ ] AGENT cannot access ADMIN routes
- [ ] JWT tokens expire after 7 days
- [ ] Response format is consistent across all endpoints

---

## 🎯 Next Steps

After confirming all tests pass:
1. Implement actual module controllers (agents, bookings, etc.)
2. Add validation middleware
3. Implement pagination utilities
4. Add logging middleware
5. Set up error tracking

---

## 💰 Income API Testing

### Automated Test Suite

Run the comprehensive income API test suite:

```bash
node test-income-apis.js
```

**Prerequisites:**
- Server must be running on `http://localhost:5001`
- Database must be seeded with admin user (`admin@soulter.com` / `admin123`)
- At least one booking should exist for booking-linked income tests

**Test Coverage (18 tests):**
1. ✅ Admin login
2. ✅ Get test booking ID
3. ✅ Create MANUAL income (success)
4. ❌ Create BOOKING income without bookingId (validation fail)
5. ❌ Create BOOKING income with invalid bookingId (404)
6. ✅ Create BOOKING income with valid bookingId (success)
7. ✅ List all income records (pagination)
8. ✅ Get income by ID
9. ✅ Update income record
10. ✅ Get income summary (aggregations)
11. ✅ Soft delete income
12. ✅ Verify income hidden from list
13. ❌ Try to get deleted income (404)
14. ✅ Restore deleted income
15. ✅ Verify income appears in list again
16. ❌ Invalid amount validation
17. ❌ Invalid currency validation
18. ❌ Unauthorized access (no token)

**Expected Output:**
```
🧪 Starting Income API Tests
============================================================
🔐 Step 1: Login as ADMIN
✅ Admin login successful

[... continues for all 18 tests ...]

============================================================
✅ All tests completed!
============================================================
```

### Manual Testing

For manual testing with curl/Postman, see [INCOME_API_TESTING.md](INCOME_API_TESTING.md)

**Quick Test Commands:**

```bash
# Set token
TOKEN="your-admin-jwt-token"

# Create income
curl -X POST http://localhost:5001/api/finance/income \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":10000,"currency":"USD","source":"MANUAL"}'

# List income
curl http://localhost:5001/api/finance/income \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Test Files Reference

| File | Purpose | Command |
|------|---------|---------|
| `test-auth.js` | Authentication tests | `node test-auth.js` |
| `test-booking-apis.js` | Booking CRUD tests | `node test-booking-apis.js` |
| `test-income-apis.js` | **Income API tests (NEW)** | `node test-income-apis.js` |
| `test-frontend-booking.js` | Booking flow E2E | `node test-frontend-booking.js` |
