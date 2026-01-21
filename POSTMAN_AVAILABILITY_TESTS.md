# Postman Test Collection - Availability Check & Double-Booking Prevention

## Setup

1. **Base URL:** `http://localhost:5001`
2. **Get Glamp ID:** Open Prisma Studio (`npx prisma studio`) and copy a glamp ID
3. **Replace** `{{glampId}}` with your actual glamp ID in the examples below

## Test Sequence

### 1️⃣ Check Initial Availability

**Request:**
```
GET http://localhost:5001/api/bookings/availability?glampId={{glampId}}&checkIn=2026-03-01&checkOut=2026-03-04
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "conflictingCount": 0,
    "conflicts": []
  }
}
```

---

### 2️⃣ Create First Booking

**Request:**
```
POST http://localhost:5001/api/bookings
Content-Type: application/json

{
  "customerName": "Test User 1",
  "customerEmail": "test1@example.com",
  "glampId": "{{glampId}}",
  "checkInDate": "2026-03-01",
  "checkOutDate": "2026-03-04",
  "guests": 2
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Booking created successfully! We will contact you soon.",
  "booking": {
    "id": "some-uuid",
    "status": "PENDING",
    "totalAmount": 45000,
    "checkInDate": "2026-03-01T00:00:00.000Z",
    "checkOutDate": "2026-03-04T00:00:00.000Z",
    "glamp": {
      "name": "Luxury Glamp"
    },
    "customer": {
      "name": "Test User 1",
      "email": "test1@example.com"
    }
  }
}
```

✅ **Save the booking ID** for reference

---

### 3️⃣ Check Availability Again (Should Show Conflict)

**Request:**
```
GET http://localhost:5001/api/bookings/availability?glampId={{glampId}}&checkIn=2026-03-01&checkOut=2026-03-04
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "available": false,
    "conflictingCount": 1,
    "conflicts": [
      {
        "id": "booking-uuid",
        "checkIn": "2026-03-01T00:00:00.000Z",
        "checkOut": "2026-03-04T00:00:00.000Z",
        "status": "PENDING"
      }
    ]
  }
}
```

✅ **Conflict detected correctly!**

---

### 4️⃣ Attempt Exact Same Dates (Should Fail)

**Request:**
```
POST http://localhost:5001/api/bookings
Content-Type: application/json

{
  "customerName": "Test User 2",
  "customerEmail": "test2@example.com",
  "glampId": "{{glampId}}",
  "checkInDate": "2026-03-01",
  "checkOutDate": "2026-03-04",
  "guests": 2
}
```

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Glamp is not available for selected dates",
  "data": {
    "available": false,
    "conflictingCount": 1,
    "conflicts": [
      {
        "id": "booking-uuid",
        "checkIn": "2026-03-01T00:00:00.000Z",
        "checkOut": "2026-03-04T00:00:00.000Z",
        "status": "PENDING"
      }
    ]
  }
}
```

✅ **Double-booking prevented!**

---

### 5️⃣ Attempt Partial Overlap (Should Fail)

**Request:**
```
POST http://localhost:5001/api/bookings
Content-Type: application/json

{
  "customerName": "Test User 3",
  "customerEmail": "test3@example.com",
  "glampId": "{{glampId}}",
  "checkInDate": "2026-03-02",
  "checkOutDate": "2026-03-05",
  "guests": 2
}
```

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Glamp is not available for selected dates",
  "data": {
    "available": false,
    "conflictingCount": 1,
    "conflicts": [...]
  }
}
```

✅ **Overlap detected correctly!**

---

### 6️⃣ Book Immediately After (Same-Day Turnover - Should Succeed)

**Request:**
```
POST http://localhost:5001/api/bookings
Content-Type: application/json

{
  "customerName": "Test User 4",
  "customerEmail": "test4@example.com",
  "glampId": "{{glampId}}",
  "checkInDate": "2026-03-04",
  "checkOutDate": "2026-03-07",
  "guests": 2
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Booking created successfully! We will contact you soon.",
  "booking": {
    "id": "another-uuid",
    "status": "PENDING",
    "totalAmount": 45000,
    ...
  }
}
```

✅ **Same-day turnover allowed correctly!**

---

### 7️⃣ Check Overlapping Range (Should Show Both Bookings)

**Request:**
```
GET http://localhost:5001/api/bookings/availability?glampId={{glampId}}&checkIn=2026-03-03&checkOut=2026-03-06
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "available": false,
    "conflictingCount": 2,
    "conflicts": [
      {
        "id": "booking-1-uuid",
        "checkIn": "2026-03-01T00:00:00.000Z",
        "checkOut": "2026-03-04T00:00:00.000Z",
        "status": "PENDING"
      },
      {
        "id": "booking-2-uuid",
        "checkIn": "2026-03-04T00:00:00.000Z",
        "checkOut": "2026-03-07T00:00:00.000Z",
        "status": "PENDING"
      }
    ]
  }
}
```

✅ **Multiple conflicts detected!**

---

## Validation Tests

### 8️⃣ Missing Parameters

**Request:**
```
GET http://localhost:5001/api/bookings/availability?glampId={{glampId}}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Missing required parameters: glampId, checkIn, and checkOut are required"
}
```

---

### 9️⃣ Invalid Date Format

**Request:**
```
GET http://localhost:5001/api/bookings/availability?glampId={{glampId}}&checkIn=invalid-date&checkOut=2026-03-04
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid date format. Please use YYYY-MM-DD format"
}
```

---

### 🔟 Check-Out Before Check-In

**Request:**
```
GET http://localhost:5001/api/bookings/availability?glampId={{glampId}}&checkIn=2026-03-04&checkOut=2026-03-01
```

**Expected Response (400 or 422):**
```json
{
  "success": false,
  "error": "Check-out date must be after check-in date (at least 1 night)"
}
```

---

### 1️⃣1️⃣ Invalid Glamp ID

**Request:**
```
GET http://localhost:5001/api/bookings/availability?glampId=invalid-id&checkIn=2026-03-01&checkOut=2026-03-04
```

**Expected Response (400 or 422):**
```json
{
  "success": false,
  "error": "Invalid glamp ID format"
}
```

---

## Admin/Agent Booking Tests

### 1️⃣2️⃣ Admin Booking (Should Also Check Availability)

**Request:**
```
POST http://localhost:5001/api/admin/bookings
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "glampId": "{{glampId}}",
  "checkInDate": "2026-03-02T00:00:00.000Z",
  "checkOutDate": "2026-03-05T00:00:00.000Z",
  "adults": 2,
  "children": 0,
  "guest": {
    "fullName": "Admin Test Guest",
    "email": "admin-guest@example.com",
    "phone": "+1234567890"
  },
  "paymentStatus": "PAID"
}
```

**Expected Response (400 or 422):**
```json
{
  "success": false,
  "error": "This glamp is not available for the selected dates. There is 1 conflicting booking. Please choose different dates."
}
```

✅ **Admin bookings also respect availability!**

---

### 1️⃣3️⃣ Agent Booking (Should Also Check Availability)

**Request:**
```
POST http://localhost:5001/api/agent/bookings
Authorization: Bearer {{agentToken}}
Content-Type: application/json

{
  "customerName": "Agent Test Customer",
  "customerEmail": "agent-customer@example.com",
  "glampId": "{{glampId}}",
  "checkInDate": "2026-03-02",
  "checkOutDate": "2026-03-05",
  "guests": 2
}
```

**Expected Response (400 or 422):**
```json
{
  "success": false,
  "error": "This glamp is not available for the selected dates. There is 1 conflicting booking. Please choose different dates."
}
```

✅ **Agent bookings also respect availability!**

---

## Import to Postman

To import these tests into Postman:

1. Create a new Collection: "Booking Availability Tests"
2. Add an environment variable: `glampId` = your actual glamp ID
3. Add each request above as a separate item in the collection
4. Run them in sequence using Postman Collection Runner

## Expected Test Results Summary

| Test | Expected Status | Expected Result |
|------|----------------|-----------------|
| 1. Initial availability | 200 | `available: true` |
| 2. Create first booking | 201 | Booking created |
| 3. Check availability again | 200 | `available: false, conflictingCount: 1` |
| 4. Exact same dates | **409** | Error: conflicting booking |
| 5. Partial overlap | **409** | Error: conflicting booking |
| 6. Same-day turnover | 201 | Booking created (allowed) |
| 7. Overlapping range check | 200 | `conflictingCount: 2` |
| 8. Missing parameters | 400 | Error: missing parameters |
| 9. Invalid date format | 400 | Error: invalid date |
| 10. Check-out before check-in | 400/422 | Error: invalid range |
| 11. Invalid glamp ID | 400/422 | Error: invalid ID |
| 12. Admin booking overlap | **409** | Error: conflicting booking |
| 13. Agent booking overlap | **409** | Error: conflicting booking |

## Success Criteria

✅ All 13 tests should pass with expected responses  
✅ No double bookings created in database  
✅ Availability endpoint returns correct conflict information  
✅ Same-day turnover bookings are allowed  
✅ All validation rules are enforced  
✅ Admin and Agent bookings respect availability  

🎯 **Implementation is production-ready when all tests pass!**
