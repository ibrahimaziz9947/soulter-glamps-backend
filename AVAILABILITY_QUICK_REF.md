# Availability Endpoint - Quick Reference

## 🎯 What Changed

### Response Format Improvements
- ✅ `id` → `bookingId` (clearer field naming)
- ✅ ISO timestamps → YYYY-MM-DD format (simpler)
- ✅ Added `queriedRange` with night count
- ✅ Date normalization to start-of-day UTC

### Date Semantics Clarified
- **checkIn**: Inclusive (guest arrives this day)
- **checkOut**: Exclusive (guest leaves this day, glamp available)
- **Example**: checkIn=Jan 25, checkOut=Jan 27 = 2 nights (25th & 26th)

## 📡 API Usage

### Request
```
GET /api/bookings/availability?glampId={id}&checkIn={date}&checkOut={date}
```

### Response - Available
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

### Response - Not Available
```json
{
  "success": true,
  "data": {
    "available": false,
    "conflictingCount": 2,
    "conflicts": [
      {
        "bookingId": "abc-123",
        "checkIn": "2026-01-24",
        "checkOut": "2026-01-26",
        "status": "CONFIRMED"
      },
      {
        "bookingId": "def-456",
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

## 🧪 Testing

```powershell
# Set your glamp ID
$env:TEST_GLAMP_ID = "your-glamp-id-here"

# Run test
node test-improved-availability.js
```

## 🔧 Frontend Integration

### Before (Old Format)
```javascript
const conflict = response.data.conflicts[0];
console.log(conflict.id); // UUID
console.log(conflict.checkIn); // "2026-01-25T00:00:00.000Z"
// No night count available
```

### After (New Format)
```javascript
const conflict = response.data.conflicts[0];
console.log(conflict.bookingId); // UUID
console.log(conflict.checkIn); // "2026-01-25"
console.log(response.data.queriedRange.nights); // 2
```

### Display Conflicts
```jsx
{conflicts.map(c => (
  <div key={c.bookingId}>
    {c.checkIn} to {c.checkOut}
    <Badge status={c.status}>{c.status}</Badge>
  </div>
))}
```

## 📚 Full Documentation

- [AVAILABILITY_RESPONSE_ENHANCED.md](./AVAILABILITY_RESPONSE_ENHANCED.md) - Complete guide
- [test-improved-availability.js](./test-improved-availability.js) - Test script

## ✅ Benefits

**For Debugging:**
- Clear field names
- Simple date format
- Night count calculated
- Conflict details accessible

**For Users:**
- Show exact conflicting dates
- Display booking status
- Suggest alternative dates
- Clear messaging

**For Reliability:**
- Consistent date normalization
- Timezone-safe comparisons
- Predictable overlap detection
- Exclusive checkOut semantics
