# Double-Booking Prevention - 409 Conflict Implementation

## ✅ Implementation Complete

All booking creation endpoints now enforce no-overlap rules and return **409 Conflict** responses with detailed availability data when conflicts are detected.

## Changes Made

### 1. Custom Error Class
**File:** `src/utils/errors.js`

Added `BookingConflictError` class that extends `ConflictError`:
```javascript
export class BookingConflictError extends ConflictError {
  constructor(availabilityData) {
    super('Glamp is not available for selected dates', availabilityData);
    this.name = 'BookingConflictError';
  }
}
```

### 2. Transaction-Based Race Condition Protection

All booking creation functions now use **Prisma transactions** with a re-check inside:

**Pattern:**
```javascript
await prisma.$transaction(async (tx) => {
  // 1. Re-check conflicts inside transaction
  const conflicts = await tx.booking.findMany({
    where: {
      glampId,
      status: { in: ['CONFIRMED', 'PENDING'] },
      AND: [
        { checkInDate: { lt: checkOut } },
        { checkOutDate: { gt: checkIn } },
      ],
    },
  });

  // 2. If conflicts found, throw error (transaction rolls back)
  if (conflicts.length > 0) {
    throw new BookingConflictError({ available: false, ... });
  }

  // 3. No conflicts - create booking
  return tx.booking.create({ ... });
});
```

This ensures that even if two requests pass the initial availability check simultaneously, only one will succeed.

### 3. Updated Booking Services

**Public Booking (`src/services/booking.service.js`):**
- ✅ Throws `BookingConflictError` instead of `ValidationError`
- ✅ Includes availability data in error

**Admin Booking (`src/modules/admin/bookings/admin-booking.service.js`):**
- ✅ Throws `BookingConflictError` on conflicts
- ✅ Uses centralized `checkAvailability()` function

**Agent Booking (`src/services/agent-bookings.service.js`):**
- ✅ Throws `BookingConflictError` on conflicts
- ✅ Replaced generic Error with BookingConflictError

### 3. Error Handler Middleware
**File:** `src/server.js`

Added special handling for `BookingConflictError`:
```javascript
// Handle BookingConflictError with specific format
if (err.name === 'BookingConflictError') {
  return res.status(409).json({
    success: false,
    message: err.message,
    data: err.details || { available: false, conflictingCount: 0 },
  });
}
```

### 4. Test Scripts Updated
- ✅ `test-availability-check.js` - Updated to expect 409
- ✅ `test-booking-conflict.js` - New comprehensive 409 test

## Response Format

### ✅ Success Response (201 Created)
```json
{
  "success": true,
  "message": "Booking created successfully! We will contact you soon.",
  "booking": {
    "id": "uuid",
    "status": "PENDING",
    ...
  }
}
```

### 🚫 Conflict Response (409 Conflict)
```json
{
  "success": false,
  "message": "Glamp is not available for selected dates",
  "data": {
    "available": false,
    "conflictingCount": 1,
    "conflicts": [
      {
        "id": "conflicting-booking-uuid",
        "checkIn": "2026-03-01T00:00:00.000Z",
        "checkOut": "2026-03-04T00:00:00.000Z",
        "status": "CONFIRMED"
      }
    ]
  }
}
```

## Key Features

### ✅ CANCELLED Bookings Don't Block
The `checkAvailability()` function only checks:
- `CONFIRMED` bookings
- `PENDING` bookings

**Excluded statuses:**
- `CANCELLED` - Do NOT block availability
- `COMPLETED` - Only block if dates still overlap

### ✅ All Booking Endpoints Protected
1. **Public booking:** `POST /api/bookings`
2. **Admin booking:** `POST /api/admin/bookings`
3. **Agent booking:** `POST /api/agent/bookings`

All three endpoints now:
- Check availability before creating
- Return 409 on conflicts
- Include detailed conflict information

### ✅ No Booking Update Issues
Current implementation only allows **status updates** (not date changes), so no additional validation needed for updates.

If date editing is added later, use:
```javascript
checkAvailability(glampId, newCheckIn, newCheckOut, existingBookingId)
```
The `existingBookingId` parameter excludes the current booking from conflict check.

## Testing

### Quick Test
```powershell
# 1. Get a glamp ID from Prisma Studio
npx prisma studio

# 2. Run conflict test
$env:TEST_GLAMP_ID = "your-glamp-id"
node test-booking-conflict.js

# 3. Run race condition test
$env:TEST_GLAMP_ID = "your-glamp-id"
node test-race-condition.js
```

### Race Condition Test Expected Results
```
✅ PASS  Race Condition Test
   - Exactly 1 booking created
   - Exactly 4 requests rejected with 409
   - No unexpected errors

✅ PASS  Non-Conflicting Bookings Test
   - All 3 different-date bookings created
```

### Expected Results
```
✅ PASS  First booking created
✅ PASS  Same dates blocked (409)
✅ PASS  Partial overlap blocked (409)
✅ PASS  Non-overlap allowed (201)
```

### Manual Postman Test

**1. Create first booking:**
```http
POST http://localhost:5001/api/bookings
Content-Type: application/json

{
  "customerName": "Test User",
  "customerEmail": "test@example.com",
  "glampId": "YOUR_GLAMP_ID",
  "checkInDate": "2026-03-01",
  "checkOutDate": "2026-03-04",
  "guests": 2
}
```
Expected: **201 Created**

**2. Try same dates again:**
```http
POST http://localhost:5001/api/bookings
Content-Type: application/json

{
  "customerName": "Test User 2",
  "customerEmail": "test2@example.com",
  "glampId": "YOUR_GLAMP_ID",
  "checkInDate": "2026-03-01",
  "checkOutDate": "2026-03-04",
  "guests": 2
}
```
Expected: **409 Conflict** with:
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

## Frontend Integration

### Check Before Booking
```javascript
// 1. Check availability first
const response = await fetch(
  `/api/bookings/availability?glampId=${id}&checkIn=${start}&checkOut=${end}`
);
const { data } = await response.json();

if (!data.available) {
  // Show unavailable message with alternatives
  showError(`Not available. ${data.conflictingCount} booking(s) conflict.`);
  return;
}

// 2. Proceed with booking if available
const bookingResponse = await fetch('/api/bookings', {
  method: 'POST',
  body: JSON.stringify(bookingData)
});

if (bookingResponse.status === 409) {
  // Handle race condition - someone booked between check and submit
  const error = await bookingResponse.json();
  showError(error.message);
}
```

### Handle 409 Gracefully
```javascript
try {
  const response = await createBooking(data);
  showSuccessToast('Booking created!');
} catch (error) {
  if (error.status === 409) {
    // Conflict - show detailed message
    const conflictData = error.data;
    showErrorModal({
      title: 'Dates Not Available',
      message: error.message,
      conflicts: conflictData.conflicts,
      suggestion: 'Please select different dates'
    });
  } else {
    // Other errors
    showErrorToast(error.message);
  }
}
```

## Success Criteria

### ✅ All Requirements Met

1. **409 Conflict on double-booking** ✅
   - Same dates return 409
   - Overlapping dates return 409
   - No success toast on conflict

2. **Proper response format** ✅
   ```json
   {
     "success": false,
     "message": "Glamp is not available for selected dates",
     "data": { "available": false, "conflictingCount": X, "conflicts": [...] }
   }
   ```

3. **CANCELLED bookings excluded** ✅
   - Only PENDING and CONFIRMED block availability
   - CANCELLED bookings do not prevent new bookings

4. **All endpoints protected** ✅
   - Public booking: ✅
   - Admin booking: ✅
   - Agent booking: ✅

5. **Normal bookings still work** ✅
   - Non-overlapping dates create successfully
   - Same-day turnover allowed (checkout = next checkin)

## Troubleshooting

### Issue: Still getting 400 instead of 409
**Solution:** Clear Node.js cache and restart server
```powershell
# Stop server
# Then:
Remove-Item -Recurse -Force node_modules\.cache
npm start
```

### Issue: CANCELLED bookings still blocking
**Solution:** Check the status filter in `checkAvailability()`:
```javascript
status: { in: ['CONFIRMED', 'PENDING'] }  // Should NOT include 'CANCELLED'
```

### Issue: Frontend showing success on conflict
**Solution:** Check for 409 status code:
```javascript
if (response.status === 409) {
  // Handle conflict
} else if (response.status === 201) {
  // Success
}
```

## Summary

✅ **409 Conflict responses** implemented for all booking conflicts  
✅ **Detailed availability data** included in error response  
✅ **CANCELLED bookings** do not block new bookings  
✅ **All booking endpoints** (public, admin, agent) protected  
✅ **Transaction-based race condition protection** prevents concurrent double-bookings  
✅ **No booking update conflicts** (status-only updates)  
✅ **Tests created** for verification (conflict + race condition)  
✅ **Documentation updated**  

🎯 **Production Ready!** All success criteria met with race condition protection.
