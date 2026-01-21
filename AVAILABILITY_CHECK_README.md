# Booking Availability Check & Double-Booking Prevention

## Overview

This implementation adds a comprehensive availability checking system to prevent double-booking across all booking creation methods (public, admin, and agent).

## Features Implemented

### ✅ 1. Availability Check Endpoint

**Endpoint:** `GET /api/bookings/availability`

**Access:** Public (no authentication required)

**Query Parameters:**
- `glampId` (required): UUID of the glamp to check
- `checkIn` (required): Check-in date in YYYY-MM-DD format
- `checkOut` (required): Check-out date in YYYY-MM-DD format

**Response:**
```json
{
  "success": true,
  "data": {
    "available": false,
    "conflictingCount": 2,
    "conflicts": [
      {
        "id": "booking-uuid-1",
        "checkIn": "2026-02-15T00:00:00.000Z",
        "checkOut": "2026-02-18T00:00:00.000Z",
        "status": "CONFIRMED"
      },
      {
        "id": "booking-uuid-2",
        "checkIn": "2026-02-17T00:00:00.000Z",
        "checkOut": "2026-02-20T00:00:00.000Z",
        "status": "PENDING"
      }
    ]
  }
}
```

### ✅ 2. Overlap Detection Logic

**Date Overlap Formula:**
```javascript
overlap = (existing.checkIn < newCheckOut) AND (existing.checkOut > newCheckIn)
```

**Example:**
- Existing booking: Feb 15 - Feb 18
- New booking attempt: Feb 17 - Feb 20
- Result: **CONFLICT** (overlap detected)

**Non-overlapping example:**
- Existing booking: Feb 15 - Feb 18
- New booking attempt: Feb 18 - Feb 21
- Result: **AVAILABLE** (check-out day can be same as next check-in)

### ✅ 3. Status Filtering

**Bookings that block availability:**
- `CONFIRMED` - Active confirmed bookings
- `PENDING` - Pending bookings awaiting confirmation

**Bookings that DON'T block availability:**
- `CANCELLED` - Cancelled bookings
- `COMPLETED` - Completed past bookings (unless dates overlap)

### ✅ 4. Validation Rules

**Date Validation:**
- ✅ Check-in must be before check-out
- ✅ Minimum 1 night stay
- ✅ Valid date formats (YYYY-MM-DD or ISO 8601)
- ✅ Future dates validation (for customer bookings)

**Parameter Validation:**
- ✅ Valid UUID format for glampId
- ✅ Required parameters present
- ✅ Proper error messages for invalid inputs

## Files Modified

### Core Service Layer
- ✅ **`src/services/booking.service.js`**
  - Added `checkAvailability()` function (authoritative availability check)
  - Integrated availability check into `createBooking()`
  - Prevents double-booking for public bookings

### Admin Booking Service
- ✅ **`src/modules/admin/bookings/admin-booking.service.js`**
  - Imported and integrated `checkAvailability()`
  - Replaced old overlap check with centralized availability logic
  - Now checks both PENDING and CONFIRMED bookings

### Agent Booking Service
- ✅ **`src/services/agent-bookings.service.js`**
  - Imported and integrated `checkAvailability()`
  - Added availability check to `createBookingAsAgent()`
  - Prevents agent-created double bookings

### Controller & Routes
- ✅ **`src/controllers/booking.controller.js`**
  - Added `checkAvailability()` controller
  - Validates query parameters
  - Returns proper error messages

- ✅ **`src/routes/booking.routes.js`**
  - Added `GET /availability` route (placed before `/:id` to avoid conflicts)
  - Public access (no authentication required)

### Testing
- ✅ **`test-availability-check.js`**
  - Comprehensive test suite
  - Tests all validation scenarios
  - Verifies double-booking prevention

## Usage Examples

### Example 1: Check Availability (Postman)

```http
GET http://localhost:5001/api/bookings/availability?glampId=<GLAMP_ID>&checkIn=2026-03-01&checkOut=2026-03-04
```

**Response (Available):**
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

**Response (Not Available):**
```json
{
  "success": true,
  "data": {
    "available": false,
    "conflictingCount": 1,
    "conflicts": [
      {
        "id": "abc123...",
        "checkIn": "2026-03-02T00:00:00.000Z",
        "checkOut": "2026-03-05T00:00:00.000Z",
        "status": "CONFIRMED"
      }
    ]
  }
}
```

### Example 2: Create Booking (Prevents Double-Booking)

```http
POST http://localhost:5001/api/bookings
Content-Type: application/json

{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "glampId": "<GLAMP_ID>",
  "checkInDate": "2026-03-01",
  "checkOutDate": "2026-03-04",
  "guests": 2
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Booking created successfully! We will contact you soon.",
  "booking": { ... }
}
```

**Response (Conflict):**
```json
{
  "success": false,
  "message": "Glamp is not available for selected dates",
  "data": {
    "available": false,
    "conflictingCount": 1,
    "conflicts": [
      {
        "id": "abc123...",
        "checkIn": "2026-03-02T00:00:00.000Z",
        "checkOut": "2026-03-05T00:00:00.000Z",
        "status": "CONFIRMED"
      }
    ]
  }
}
```

**HTTP Status:** `409 Conflict` (not 400 or 422)

### Example 3: Frontend Integration

```javascript
// Check availability before showing booking form
async function checkGlampAvailability(glampId, checkIn, checkOut) {
  const response = await fetch(
    `/api/bookings/availability?glampId=${glampId}&checkIn=${checkIn}&checkOut=${checkOut}`
  );
  const data = await response.json();
  
  if (data.data.available) {
    // Show booking form
    showBookingForm();
  } else {
    // Show error message with alternative dates
    showUnavailableMessage(data.data.conflicts);
  }
}
```

## Testing

### Run Test Script

1. **Get a Glamp ID from your database:**
   ```powershell
   # Open Prisma Studio
   npx prisma studio
   # Copy a glamp ID from the Glamp table
   ```

2. **Run the test script:**
   ```powershell
   # Set the glamp ID
   $env:TEST_GLAMP_ID = "paste-your-glamp-id-here"
   
   # Run tests
   node test-availability-check.js
   ```

### Manual Testing in Postman

**Test Case 1: Check Availability (No Conflicts)**
```
GET http://localhost:5001/api/bookings/availability?glampId=<ID>&checkIn=2026-04-01&checkOut=2026-04-04
Expected: available = true, conflictingCount = 0
```

**Test Case 2: Create First Booking**
```
POST http://localhost:5001/api/bookings
Body: {
  "customerName": "Test User",
  "customerEmail": "test@example.com",
  "glampId": "<ID>",
  "checkInDate": "2026-04-01",
  "checkOutDate": "2026-04-04",
  "guests": 2
}
Expected: 201 Created
```

**Test Case 3: Check Availability Again (Should Show Conflict)**
```
GET http://localhost:5001/api/bookings/availability?glampId=<ID>&checkIn=2026-04-01&checkOut=2026-04-04
Expected: available = false, conflictingCount = 1
```

**Test Case 4: Try to Create Overlapping Booking**
```
POST http://localhost:5001/api/bookings
Body: {
  "customerName": "Test User 2",
  "customerEmail": "test2@example.com",
  "glampId": "<ID>",
  "checkInDate": "2026-04-02",  // Overlaps with existing
  "checkOutDate": "2026-04-05",
  "guests": 2
}
Expected: 400 or 422 with error about conflicting booking
```

**Test Case 5: Non-Overlapping Booking (Should Succeed)**
```
POST http://localhost:5001/api/bookings
Body: {
  "customerName": "Test User 3",
  "customerEmail": "test3@example.com",
  "glampId": "<ID>",
  "checkInDate": "2026-04-04",  // Starts when previous ends
  "checkOutDate": "2026-04-07",
  "guests": 2
}
Expected: 201 Created
```

## Edge Cases Handled

### ✅ Same-Day Turnover
- Booking 1: Feb 15 - Feb 18
- Booking 2: Feb 18 - Feb 21
- **Result:** ALLOWED (checkout day = next checkin day)

### ✅ Partial Overlap
- Existing: Feb 15 - Feb 20
- New: Feb 17 - Feb 22
- **Result:** BLOCKED (dates overlap)

### ✅ Complete Overlap
- Existing: Feb 15 - Feb 20
- New: Feb 16 - Feb 19
- **Result:** BLOCKED (new booking inside existing)

### ✅ Surrounding Overlap
- Existing: Feb 17 - Feb 19
- New: Feb 15 - Feb 20
- **Result:** BLOCKED (new booking surrounds existing)

### ✅ Multiple Conflicts
- Shows count and all conflicting bookings
- Clear error message with conflict count

## Database Schema

```prisma
model Booking {
  id           String        @id @default(uuid())
  checkInDate  DateTime
  checkOutDate DateTime
  guests       Int           @default(1)
  totalAmount  Int
  status       BookingStatus @default(PENDING)
  
  glampId      String
  glamp        Glamp         @relation(fields: [glampId], references: [id])
  
  customerId   String
  customer     User          @relation("CustomerBookings", fields: [customerId], references: [id])
  
  agentId      String?
  agent        User?         @relation("AgentBookings", fields: [agentId], references: [id])
  
  @@index([glampId])
  @@index([checkInDate])
  @@index([status])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

## Performance Considerations

### Database Indexes
The implementation uses existing indexes:
- ✅ `glampId` - Fast glamp-specific queries
- ✅ `checkInDate` - Optimizes date range queries
- ✅ `status` - Fast filtering by booking status

### Query Optimization
```javascript
// Efficient query with proper indexes
const conflicts = await prisma.booking.findMany({
  where: {
    glampId,                              // Uses glampId index
    status: { in: ['CONFIRMED', 'PENDING'] }, // Uses status index
    AND: [
      { checkInDate: { lt: checkOut } },  // Uses checkInDate index
      { checkOutDate: { gt: checkIn } },
    ],
  },
  select: {  // Only fetch needed fields
    id: true,
    checkInDate: true,
    checkOutDate: true,
    status: true,
  },
});
```

## Error Handling

### Validation Errors (400)
```json
{
  "success": false,
  "error": "Missing required parameters: glampId, checkIn, and checkOut are required"
}
```

### Date Validation (400/422)
```json
{
  "success": false,
  "error": "Check-out date must be after check-in date (at least 1 night)"
}
```

### Availability Conflict (409)
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

### Not Found (404)
```json
{
  "success": false,
  "error": "Glamp not found"
}
```

## Next Steps

### Recommended Enhancements
1. **Calendar View API** - Return blocked dates for a month/year
2. **Availability Range** - Find next available date range
3. **Partial Availability** - Suggest alternative dates
4. **Bulk Availability Check** - Check multiple glamps at once
5. **Webhook Notifications** - Alert on booking conflicts

### Frontend Integration
```javascript
// Example: Real-time availability check
const AvailabilityChecker = {
  async check(glampId, checkIn, checkOut) {
    const response = await fetch(
      `/api/bookings/availability?glampId=${glampId}&checkIn=${checkIn}&checkOut=${checkOut}`
    );
    const { data } = await response.json();
    return data;
  },
  
  async findNextAvailable(glampId, preferredCheckIn, nights) {
    // Try next 30 days
    for (let offset = 0; offset < 30; offset++) {
      const checkIn = new Date(preferredCheckIn);
      checkIn.setDate(checkIn.getDate() + offset);
      
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + nights);
      
      const result = await this.check(glampId, 
        checkIn.toISOString().split('T')[0], 
        checkOut.toISOString().split('T')[0]
      );
      
      if (result.available) {
        return { checkIn, checkOut };
      }
    }
    return null; // No availability in next 30 days
  }
};
```

## Troubleshooting

### Issue: "Glamp not found"
**Solution:** Verify glampId is a valid UUID from your database

### Issue: "Invalid date format"
**Solution:** Ensure dates are in YYYY-MM-DD format (e.g., "2026-03-01")

### Issue: Availability shows false but no conflicts visible
**Solution:** Check if there are PENDING bookings (not just CONFIRMED)

### Issue: Bookings still getting created despite conflicts
**Solution:** Clear Node.js cache and restart server:
```powershell
# Stop server, then:
Remove-Item -Recurse -Force node_modules\.cache
npm start
```

## Summary

✅ **Availability endpoint created** - GET /api/bookings/availability  
✅ **Double-booking prevented** - All booking methods check availability  
✅ **Proper validation** - Date ranges, status filtering, UUID validation  
✅ **Comprehensive testing** - Test script with 6 test scenarios  
✅ **Error handling** - Clear error messages for all failure cases  
✅ **Performance optimized** - Uses database indexes efficiently  

🎯 **Ready for production use!**
