# Super Admin Bookings API

## Overview
The Super Admin Bookings API provides comprehensive booking management endpoints for super administrators. All endpoints are protected by `SUPER_ADMIN` authentication.

## Base URL
```
/api/super-admin/bookings
```

## Authentication
All endpoints require:
- `authRequired` middleware (valid JWT token)
- `requireSuperAdmin` middleware (SUPER_ADMIN role)

## Endpoints

### 1. Get All Bookings
**GET** `/api/super-admin/bookings`

Retrieve a paginated list of bookings with filtering and search capabilities.

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `from` | string | 30 days ago | Start date (ISO/YYYY-MM-DD format) |
| `to` | string | today | End date (ISO/YYYY-MM-DD format) |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | string | - | Filter by booking status (PENDING, CONFIRMED, CANCELLED, COMPLETED) |
| `search` | string | - | Search customer name, email, or booking ID |
| `sort` | string | `createdAt_desc` | Sort field and direction (e.g., `totalAmount_desc`, `checkInDate_asc`) |

#### Response
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "createdAt": "2026-01-15T10:30:00.000Z",
        "status": "CONFIRMED",
        "customerName": "John Doe",
        "glampName": "Mountain View Glamp",
        "totalAmountCents": 50000,
        "agentId": "uuid-or-null",
        "checkInDate": "2026-01-20T00:00:00.000Z",
        "checkOutDate": "2026-01-25T00:00:00.000Z",
        "guests": 2
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    },
    "range": {
      "from": "2025-12-19T00:00:00.000Z",
      "to": "2026-01-18T23:59:59.999Z"
    },
    "aggregates": {
      "totalBookings": 45,
      "confirmedCount": 30,
      "pendingCount": 10,
      "cancelledCount": 3,
      "completedCount": 2,
      "revenueCents": 1500000
    }
  }
}
```

#### Example Requests
```bash
# Get all bookings (last 30 days, default pagination)
GET /api/super-admin/bookings

# Get confirmed bookings
GET /api/super-admin/bookings?status=CONFIRMED

# Search for specific customer
GET /api/super-admin/bookings?search=john@example.com

# Custom date range with pagination
GET /api/super-admin/bookings?from=2026-01-01&to=2026-01-31&page=2&limit=10

# Sort by total amount descending
GET /api/super-admin/bookings?sort=totalAmount_desc

# Combine filters
GET /api/super-admin/bookings?status=CONFIRMED&from=2026-01-01&search=mountain&limit=5
```

---

### 2. Get Booking by ID
**GET** `/api/super-admin/bookings/:id`

Retrieve detailed information about a specific booking, including all related entities.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Booking UUID |

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "checkInDate": "2026-01-20T00:00:00.000Z",
    "checkOutDate": "2026-01-25T00:00:00.000Z",
    "guests": 2,
    "totalAmount": 50000,
    "status": "CONFIRMED",
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER",
      "active": true,
      "createdAt": "2026-01-10T00:00:00.000Z"
    },
    "agent": {
      "id": "uuid",
      "name": "Jane Agent",
      "email": "agent@example.com",
      "role": "AGENT",
      "active": true
    },
    "glamp": {
      "id": "uuid",
      "name": "Mountain View Glamp",
      "address": "123 Mountain Rd",
      "city": "Aspen",
      "state": "Colorado",
      "zipCode": "81611",
      "pricePerNight": 10000,
      "maxGuests": 4,
      "status": "ACTIVE"
    },
    "commission": {
      "id": "uuid",
      "amount": 5000,
      "status": "PAID",
      "createdAt": "2026-01-15T00:00:00.000Z"
    },
    "incomes": [
      {
        "id": "uuid",
        "amount": 50000,
        "source": "BOOKING",
        "status": "CONFIRMED",
        "notes": "Full payment received",
        "createdAt": "2026-01-15T10:30:00.000Z"
      }
    ],
    "customerName": "John Doe",
    "glampName": "Mountain View Glamp",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Booking not found"
}
```

#### Example Requests
```bash
# Get specific booking
GET /api/super-admin/bookings/123e4567-e89b-12d3-a456-426614174000

# Non-existent booking returns 404
GET /api/super-admin/bookings/invalid-id
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied. Required role(s): SUPER_ADMIN"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Booking not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid date format"
}
```

---

## Features

### Date Range Parsing
- Uses the `parseDateRange` utility for consistent date handling
- **Filters by `createdAt` (booking creation date)**, not `checkInDate`
- Defaults to last 30 days if no dates provided
- Accepts ISO format or YYYY-MM-DD format
- Validates date ranges (from < to)

### Search Functionality
- Case-insensitive search across:
  - Booking ID
  - Customer name (snapshot field)
  - Customer email

### Status Filtering
- Accepts: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`
- Special handling:
  - Empty string or `'ALL'` - ignored (returns all statuses)
  - Invalid status - returns no results
- Frontend should send `undefined` or omit parameter for "All Status" option
- Format: `field_direction` (e.g., `createdAt_desc`, `totalAmount_asc`)
- Default: `createdAt_desc` (newest first)
- Supported fields: Any booking field (createdAt, totalAmount, checkInDate, etc.)

### Pagination
- Uses Prisma `skip` and `take` for efficient pagination
- Default page: 1
- Default limit: 20
- Returns comprehensive metadata including total count and pages
- Total count uses same filters as main query for accuracy

### Light List Response
- Minimal fields for performance
- Uses snapshot fields (customerName, glampName) to avoid joins
- Only includes agentId (not full agent object)
- All money values returned as **cents (integers)**:
  - `totalAmountCents` - Booking total in cents

### Aggregates
- Computed from entire filtered dataset (not just current page)
- **totalBookings**: Total count matching filters
- **confirmedCount**: Count of CONFIRMED bookings
- **pendingCount**: Count of PENDING bookings
- **cancelledCount**: Count of CANCELLED bookings
- **completedCount**: Count of COMPLETED bookings
- **revenueCents**: Sum of totalAmount for CONFIRMED + COMPLETED bookings (in cents)

### Related Entities
- Customer information (User with CUSTOMER role)
- Agent information (User with AGENT role, if applicable)
- Glamp details (with pricePerNight in cents)
- Commission (if agent involved, amount in cents)
- Income records (payment history, amounts in cents)

### Money Values
- **All monetary amounts are returned as integers in cents**
- No currency field (single currency system assumed)
- Fields: `totalAmountCents`, `pricePerNight`, `amount`, etc.

---

## Implementation Details

### Files Created
1. **Controller**: `src/modules/super-admin/bookings/super-admin-bookings.controller.js`
2. **Routes**: `src/modules/super-admin/bookings/super-admin-bookings.routes.js`
3. **Route Registration**: Updated `src/routes/super-admin.routes.js`

### Middleware Stack
```javascript
router.get('/', authRequired, requireSuperAdmin, getAllBookings);
router.get('/:id', authRequired, requireSuperAdmin, getBookingById);
```

### Dependencies
- `prisma` - Database queries
- `asyncHandler` - Error handling wrapper
- `parseDateRange` - Date range parsing utility
- `getPagination` / `getPaginationMeta` - Pagination helpers
- `authRequired` - JWT authentication middleware
- `requireSuperAdmin` - Role-based authorization

---

## Testing

A test script is provided at `test-super-admin-bookings.js`.

### Setup
```bash
# Set environment variables
export API_URL=http://localhost:5001
export SUPER_ADMIN_TOKEN=your-jwt-token-here

# Run tests
node test-super-admin-bookings.js
```

### Test Coverage
- ✅ Get all bookings (default params)
- ✅ Pagination
- ✅ Status filtering
- ✅ Search functionality
- ✅ Date range filtering
- ✅ Sorting
- ✅ Get booking by ID
- ✅ Non-existent booking (404)
- ✅ Unauthorized access (401)

---

## Notes

- **Date Filtering**: Uses `createdAt` (booking creation date) for filtering, not `checkInDate`
- **Money Values**: All amounts are in smallest currency unit (cents) as integers
- Dates are stored and returned in ISO 8601 format
- The API reuses existing utilities and patterns from the dashboard and finance APIs
- Customer and glamp names are denormalized (snapshot fields) for performance
- Agent field is optional (null if booking not referred by an agent)
- List endpoint returns lightweight items for better performance
- Detail endpoint includes full related entities for comprehensive view
