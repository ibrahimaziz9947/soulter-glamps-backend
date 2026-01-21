# Availability Endpoint - Enhanced Response Format

## Overview

The `/api/bookings/availability` endpoint has been improved to provide clear, detailed conflict information for easier frontend debugging and better user experience.

## Key Improvements

### 1. **Clear Conflict Details**
Each conflict now includes:
- `bookingId` - Unique identifier for the conflicting booking
- `checkIn` - Arrival date in YYYY-MM-DD format
- `checkOut` - Departure date in YYYY-MM-DD format
- `status` - Booking status (CONFIRMED, PENDING, etc.)

### 2. **Consistent Date Normalization**
- All dates normalized to **start-of-day UTC (00:00:00.000Z)**
- Time components are stripped for consistent overlap detection
- Eliminates timezone-related bugs

### 3. **Query Range Information**
Response includes `queriedRange` with:
- `checkIn` - Normalized check-in date
- `checkOut` - Normalized check-out date
- `nights` - Number of nights calculated

### 4. **Date Semantics Clarification**
- **checkIn**: Guest arrival date (**inclusive**)
- **checkOut**: Guest departure date (**exclusive**)
- Example: `checkIn=2026-01-25, checkOut=2026-01-27` = 2 nights (25th and 26th)

## Endpoint Details

### Request

```http
GET /api/bookings/availability
```

**Query Parameters:**
| Parameter | Type | Required | Format | Description |
|-----------|------|----------|--------|-------------|
| glampId | string | Yes | UUID | ID of the glamp to check |
| checkIn | string | Yes | YYYY-MM-DD | Check-in date (inclusive) |
| checkOut | string | Yes | YYYY-MM-DD | Check-out date (exclusive) |

**Example:**
```
GET /api/bookings/availability?glampId=123e4567-e89b-12d3-a456-426614174000&checkIn=2026-01-25&checkOut=2026-01-27
```

### Response Format

#### Success - Available (No Conflicts)

```json
{
  "success": true,
  "data": {
    "available": true,
    "conflictingCount": 0,
    "conflicts": [],
    "queriedRange": {
      "checkIn": "2026-01-25",
      "checkOut": "2026-01-27",
      "nights": 2
    }
  }
}
```

#### Success - Not Available (With Conflicts)

```json
{
  "success": true,
  "data": {
    "available": false,
    "conflictingCount": 2,
    "conflicts": [
      {
        "bookingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "checkIn": "2026-01-24",
        "checkOut": "2026-01-26",
        "status": "CONFIRMED"
      },
      {
        "bookingId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "checkIn": "2026-01-26",
        "checkOut": "2026-01-28",
        "status": "PENDING"
      }
    ],
    "queriedRange": {
      "checkIn": "2026-01-25",
      "checkOut": "2026-01-27",
      "nights": 2
    }
  }
}
```

#### Error - Validation Failed

```json
{
  "success": false,
  "error": "Invalid date format. Please use YYYY-MM-DD format"
}
```

```json
{
  "success": false,
  "error": "Check-out date must be after check-in date (at least 1 night)"
}
```

## Date Normalization Logic

### Implementation

All dates are normalized to start-of-day UTC before conflict checking:

```javascript
const normalizeToStartOfDay = (date) => {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};
```

### Why Normalization Matters

**Without normalization:**
```javascript
// User input: "2026-01-25" (parsed as local midnight)
// Database: 2026-01-25T05:00:00.000Z (UTC, if local is UTC-5)
// Comparison issues due to time component differences
```

**With normalization:**
```javascript
// User input: "2026-01-25" or "2026-01-25T15:30:00"
// Normalized: 2026-01-25T00:00:00.000Z
// Database: 2026-01-25T00:00:00.000Z
// Clean comparison - only dates matter
```

### Time Component Handling

The endpoint accepts dates with or without time components:

```
✅ /availability?checkIn=2026-01-25&checkOut=2026-01-27
✅ /availability?checkIn=2026-01-25T14:00:00&checkOut=2026-01-27T11:00:00
```

Both are normalized to start-of-day:
- `2026-01-25T00:00:00.000Z`
- `2026-01-27T00:00:00.000Z`

## Overlap Detection

### Overlap Logic

Two bookings conflict if their date ranges overlap:

```javascript
(existing.checkIn < newCheckOut) AND (existing.checkOut > newCheckIn)
```

### Visual Examples

#### ✅ No Conflict - Sequential Bookings

```
Existing:  [Jan 20] ---------- [Jan 23]
Requested:                         [Jan 23] ---------- [Jan 26]
Result: Available ✓ (checkOut is exclusive, guest leaves Jan 23)
```

#### ❌ Conflict - Partial Overlap

```
Existing:  [Jan 20] ---------- [Jan 25]
Requested:             [Jan 23] ---------- [Jan 28]
Result: Not Available ✗ (overlaps Jan 23-24)
```

#### ❌ Conflict - Complete Overlap

```
Existing:  [Jan 20] -------------------- [Jan 28]
Requested:             [Jan 23] ---- [Jan 25]
Result: Not Available ✗ (completely inside existing)
```

#### ❌ Conflict - Nested Overlap

```
Existing:              [Jan 23] ---- [Jan 25]
Requested: [Jan 20] -------------------- [Jan 28]
Result: Not Available ✗ (existing booking inside requested range)
```

## Status Filtering

Only **active** bookings block availability:

**Blocking Statuses:**
- ✅ `CONFIRMED` - Paid and confirmed booking
- ✅ `PENDING` - Awaiting confirmation/payment

**Non-Blocking Statuses:**
- ❌ `CANCELLED` - Customer cancelled
- ❌ `COMPLETED` - Stay has ended
- ❌ `REJECTED` - Booking was rejected

## Frontend Integration

### Display Conflicts to Users

```javascript
const response = await fetch(
  `/api/bookings/availability?glampId=${glampId}&checkIn=${checkIn}&checkOut=${checkOut}`
);
const { data } = await response.json();

if (!data.available) {
  console.log(`Not available: ${data.conflictingCount} conflicting bookings`);
  
  data.conflicts.forEach(conflict => {
    console.log(`Booking ${conflict.bookingId}:`);
    console.log(`  ${conflict.checkIn} to ${conflict.checkOut}`);
    console.log(`  Status: ${conflict.status}`);
  });
}
```

### Calculate Alternative Dates

```javascript
// Suggest dates after last conflict
const lastConflict = data.conflicts[data.conflicts.length - 1];
const suggestedCheckIn = new Date(lastConflict.checkOut);
const nights = data.queriedRange.nights;
const suggestedCheckOut = new Date(suggestedCheckIn);
suggestedCheckOut.setDate(suggestedCheckOut.getDate() + nights);

console.log(`Alternative dates: ${suggestedCheckIn} to ${suggestedCheckOut}`);
```

### Filter by Status

```javascript
const confirmedConflicts = data.conflicts.filter(c => c.status === 'CONFIRMED');
const pendingConflicts = data.conflicts.filter(c => c.status === 'PENDING');

console.log(`${confirmedConflicts.length} confirmed, ${pendingConflicts.length} pending`);
```

### Display to User

```jsx
{!availability.available && (
  <div className="conflict-warning">
    <h4>Dates Not Available</h4>
    <p>
      Your selected dates ({availability.queriedRange.checkIn} to{' '}
      {availability.queriedRange.checkOut}, {availability.queriedRange.nights} nights)
      conflict with {availability.conflictingCount} existing booking(s):
    </p>
    <ul>
      {availability.conflicts.map(conflict => (
        <li key={conflict.bookingId}>
          {conflict.checkIn} to {conflict.checkOut}
          <span className={`status-${conflict.status.toLowerCase()}`}>
            {conflict.status}
          </span>
        </li>
      ))}
    </ul>
  </div>
)}
```

## Testing

### Test Script

```bash
$env:TEST_GLAMP_ID = "your-glamp-id"
node test-improved-availability.js
```

### Test Scenarios

The test script verifies:
1. ✅ Initial availability (no conflicts)
2. ✅ Creating a booking
3. ✅ Detecting conflicts with enhanced details
4. ✅ Partial overlap detection
5. ✅ Non-overlapping date ranges
6. ✅ Date normalization with time components

### Example Output

```
📥 Enhanced Response (200):
{
  "success": true,
  "data": {
    "available": false,
    "conflictingCount": 1,
    "conflicts": [
      {
        "bookingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "checkIn": "2026-02-01",
        "checkOut": "2026-02-04",
        "status": "CONFIRMED"
      }
    ],
    "queriedRange": {
      "checkIn": "2026-02-01",
      "checkOut": "2026-02-04",
      "nights": 3
    }
  }
}

🔍 Conflict Analysis:
   Available: false
   Conflicting Count: 1
   Queried Range: 2026-02-01 to 2026-02-04 (3 nights)

📋 Conflicting Bookings:
   1. Booking ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
      Check-In:  2026-02-01
      Check-Out: 2026-02-04
      Status:    CONFIRMED
```

## Migration Notes

### Breaking Changes

**Response Format Changed:**

**Old format:**
```json
{
  "conflicts": [
    {
      "id": "...",
      "checkIn": "2026-01-25T00:00:00.000Z",
      "checkOut": "2026-01-27T00:00:00.000Z",
      "status": "CONFIRMED"
    }
  ]
}
```

**New format:**
```json
{
  "conflicts": [
    {
      "bookingId": "...",
      "checkIn": "2026-01-25",
      "checkOut": "2026-01-27",
      "status": "CONFIRMED"
    }
  ],
  "queriedRange": {
    "checkIn": "2026-01-25",
    "checkOut": "2026-01-27",
    "nights": 2
  }
}
```

### Frontend Updates Required

1. **Field name change:** `id` → `bookingId`
2. **Date format change:** ISO timestamp → YYYY-MM-DD
3. **New field:** `queriedRange` added

**Update your code:**
```javascript
// Old
conflict.id
conflict.checkIn // "2026-01-25T00:00:00.000Z"

// New
conflict.bookingId
conflict.checkIn // "2026-01-25"
```

## Benefits Summary

### For Frontend Developers
- ✅ Clear field names (`bookingId` instead of `id`)
- ✅ Simple date format (YYYY-MM-DD instead of ISO timestamp)
- ✅ Night count calculation provided
- ✅ Easy to debug conflicts

### For Users
- ✅ Clear messaging about why dates are unavailable
- ✅ See exact conflicting date ranges
- ✅ Understand booking status (confirmed vs pending)
- ✅ Get helpful alternative date suggestions

### For System Reliability
- ✅ Consistent date normalization eliminates timezone bugs
- ✅ Predictable overlap detection
- ✅ Status filtering prevents false conflicts from cancelled bookings
- ✅ Clear semantics (checkOut is exclusive)

## Related Documentation

- [BOOKING_CONFLICT_409_IMPLEMENTATION.md](./BOOKING_CONFLICT_409_IMPLEMENTATION.md) - 409 error handling
- [RACE_CONDITION_PROTECTION.md](./RACE_CONDITION_PROTECTION.md) - Transaction-based protection
- [test-improved-availability.js](./test-improved-availability.js) - Automated test script
