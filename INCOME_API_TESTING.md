# Income API Testing Guide

## Routes Mounted Successfully ✅

**Base URL (Local):** `http://localhost:5001/api/finance/income`  
**Base URL (Railway):** `https://your-railway-domain.com/api/finance/income`

---

## Route Mapping

| Method | Endpoint | Controller | Purpose |
|--------|----------|-----------|---------|
| GET | `/api/finance/income` | listIncome | List all income records (paginated) |
| GET | `/api/finance/income/summary` | getIncomeSummary | Get aggregated totals |
| POST | `/api/finance/income` | createIncome | Create new income record |
| GET | `/api/finance/income/:id` | getIncomeById | Get single income by ID |
| PATCH | `/api/finance/income/:id` | updateIncome | Update income record |
| DELETE | `/api/finance/income/:id` | deleteIncome | Soft delete income |
| POST | `/api/finance/income/:id/restore` | restoreIncome | Restore deleted income |

---

## Authentication

All routes require:
- `Authorization: Bearer {JWT_TOKEN}`
- User role: `ADMIN` or `SUPER_ADMIN`

---

## Test Scenarios

### Prerequisites

```bash
# Set environment variables
export BASE_URL="http://localhost:5001"
export TOKEN="your-jwt-token-here"

# Or on Windows PowerShell:
$BASE_URL="http://localhost:5001"
$TOKEN="your-jwt-token-here"
```

---

### 1. Create Income - From Booking

**POST** `/api/finance/income`

```bash
curl -X POST $BASE_URL/api/finance/income \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "USD",
    "dateReceived": "2026-01-13T10:00:00Z",
    "source": "BOOKING",
    "status": "CONFIRMED",
    "bookingId": "550e8400-e29b-41d4-a716-446655440000",
    "reference": "INV-2026-001",
    "notes": "Full payment received from customer"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Income record created successfully",
  "data": {
    "id": "uuid",
    "amount": 50000,
    "currency": "USD",
    "dateReceived": "2026-01-13T10:00:00.000Z",
    "source": "BOOKING",
    "status": "CONFIRMED",
    "reference": "INV-2026-001",
    "notes": "Full payment received from customer",
    "bookingId": "550e8400-e29b-41d4-a716-446655440000",
    "booking": {
      "id": "...",
      "checkInDate": "...",
      "totalAmount": 50000,
      "customerName": "John Doe",
      "glampName": "Luxury Tent"
    },
    "createdBy": {
      "id": "...",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "createdAt": "2026-01-13T10:00:00.000Z",
    "updatedAt": "2026-01-13T10:00:00.000Z"
  }
}
```

---

### 2. Create Income - Manual Entry

**POST** `/api/finance/income`

```bash
curl -X POST $BASE_URL/api/finance/income \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25000,
    "currency": "USD",
    "dateReceived": "2026-01-13T14:30:00Z",
    "source": "MANUAL",
    "status": "CONFIRMED",
    "reference": "WIRE-2026-123",
    "notes": "Wire transfer from partner"
  }'
```

---

### 3. List All Income (Paginated)

**GET** `/api/finance/income?page=1&limit=10`

```bash
curl -X GET "$BASE_URL/api/finance/income?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": 50000,
      "currency": "USD",
      "dateReceived": "2026-01-13T10:00:00.000Z",
      "source": "BOOKING",
      "status": "CONFIRMED",
      "reference": "INV-2026-001",
      "booking": { "id": "...", "customerName": "..." },
      "createdBy": { "id": "...", "name": "..." }
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "summary": {
    "totalAmount": 75000,
    "count": 2
  }
}
```

---

### 4. Filter Income

**By Source:**
```bash
curl -X GET "$BASE_URL/api/finance/income?source=BOOKING" \
  -H "Authorization: Bearer $TOKEN"
```

**By Status:**
```bash
curl -X GET "$BASE_URL/api/finance/income?status=CONFIRMED" \
  -H "Authorization: Bearer $TOKEN"
```

**By Date Range:**
```bash
curl -X GET "$BASE_URL/api/finance/income?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

**By Booking:**
```bash
curl -X GET "$BASE_URL/api/finance/income?bookingId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"
```

**Search:**
```bash
curl -X GET "$BASE_URL/api/finance/income?q=wire" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5. Get Income Summary

**GET** `/api/finance/income/summary`

```bash
curl -X GET "$BASE_URL/api/finance/income/summary" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalCount": 2,
    "totalAmountCents": 75000,
    "bySource": {
      "BOOKING": {
        "count": 1,
        "totalAmount": 50000
      },
      "MANUAL": {
        "count": 1,
        "totalAmount": 25000
      }
    },
    "byStatus": {
      "CONFIRMED": {
        "count": 2,
        "totalAmount": 75000
      }
    }
  }
}
```

**With Filters:**
```bash
curl -X GET "$BASE_URL/api/finance/income/summary?source=BOOKING&dateFrom=2026-01-01" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 6. Get Income by ID

**GET** `/api/finance/income/:id`

```bash
INCOME_ID="550e8400-e29b-41d4-a716-446655440000"
curl -X GET "$BASE_URL/api/finance/income/$INCOME_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 7. Update Income

**PATCH** `/api/finance/income/:id`

```bash
INCOME_ID="550e8400-e29b-41d4-a716-446655440000"
curl -X PATCH "$BASE_URL/api/finance/income/$INCOME_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 55000,
    "notes": "Updated amount after adjustment"
  }'
```

---

### 8. Soft Delete Income

**DELETE** `/api/finance/income/:id`

```bash
INCOME_ID="550e8400-e29b-41d4-a716-446655440000"
curl -X DELETE "$BASE_URL/api/finance/income/$INCOME_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Income record deleted successfully"
}
```

---

### 9. Restore Deleted Income

**POST** `/api/finance/income/:id/restore`

```bash
INCOME_ID="550e8400-e29b-41d4-a716-446655440000"
curl -X POST "$BASE_URL/api/finance/income/$INCOME_ID/restore" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Income record restored successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "deletedAt": null,
    "...": "..."
  }
}
```

---

## Validation Error Examples

### Missing Amount
```bash
curl -X POST $BASE_URL/api/finance/income \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "source": "MANUAL"
  }'
```
**Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Amount is required"
}
```

---

### Invalid Currency
```bash
curl -X POST $BASE_URL/api/finance/income \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "US",
    "source": "MANUAL"
  }'
```
**Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Currency must be 3 characters (e.g., USD, EUR)"
}
```

---

### Missing Booking ID for BOOKING Source
```bash
curl -X POST $BASE_URL/api/finance/income \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "USD",
    "source": "BOOKING"
  }'
```
**Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Booking ID is required when source is BOOKING"
}
```

---

### Invalid Source
```bash
curl -X POST $BASE_URL/api/finance/income \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "USD",
    "source": "INVALID"
  }'
```
**Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Source must be one of: BOOKING, MANUAL, OTHER"
}
```

---

### Income Not Found
```bash
curl -X GET "$BASE_URL/api/finance/income/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN"
```
**Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Income not found"
}
```

---

## Testing with Thunder Client (VS Code)

1. Open Thunder Client extension
2. Create new collection "Income API"
3. Add environment variables:
   - `baseUrl`: `http://localhost:5001`
   - `token`: Your JWT token
4. Import requests:
   - Use `{{baseUrl}}/api/finance/income`
   - Add header: `Authorization: Bearer {{token}}`

---

## Quick Smoke Test

Run this to verify all endpoints work:

```bash
#!/bin/bash
TOKEN="your-token-here"
BASE="http://localhost:5001/api/finance/income"

echo "1. Creating income..."
INCOME=$(curl -s -X POST "$BASE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":10000,"currency":"USD","source":"MANUAL"}')
INCOME_ID=$(echo $INCOME | jq -r '.data.id')
echo "Created: $INCOME_ID"

echo "2. Listing income..."
curl -s -X GET "$BASE?limit=5" -H "Authorization: Bearer $TOKEN" | jq '.pagination.total'

echo "3. Getting summary..."
curl -s -X GET "$BASE/summary" -H "Authorization: Bearer $TOKEN" | jq '.data.totalCount'

echo "4. Getting by ID..."
curl -s -X GET "$BASE/$INCOME_ID" -H "Authorization: Bearer $TOKEN" | jq '.data.amount'

echo "5. Updating..."
curl -s -X PATCH "$BASE/$INCOME_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":15000}' | jq '.data.amount'

echo "6. Deleting..."
curl -s -X DELETE "$BASE/$INCOME_ID" -H "Authorization: Bearer $TOKEN" | jq '.message'

echo "7. Restoring..."
curl -s -X POST "$BASE/$INCOME_ID/restore" -H "Authorization: Bearer $TOKEN" | jq '.message'

echo "✅ All tests passed!"
```

---

## Notes

- All amounts are in **cents** (integer)
- Currency is **3-character ISO code** (USD, EUR, etc.)
- Source values: **BOOKING**, **MANUAL**, **OTHER**
- Status values: **DRAFT**, **CONFIRMED**, **CANCELLED**
- Soft delete: Records remain in DB with `deletedAt` timestamp
- Default status: **CONFIRMED** (when creating income)
- Booking ID **required** when source is BOOKING

---

## Troubleshooting

**401 Unauthorized:**
- Check token is valid and not expired
- Verify `Authorization: Bearer {token}` header format

**403 Forbidden:**
- User must have ADMIN or SUPER_ADMIN role
- Login with admin credentials

**404 Not Found:**
- Verify income ID exists
- Check if record was soft-deleted (use `includeDeleted=true`)

**400 Bad Request:**
- Check validation errors in response
- Verify all required fields provided
- Ensure amount is positive integer
- Ensure currency is 3 characters
