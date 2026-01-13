# Purchase API Endpoints

Base URL: `/api/finance/purchases`

All endpoints require authentication (`authRequired`) and admin privileges (`requireAdmin`).

## Endpoints

### 1. List Purchases
**GET** `/api/finance/purchases`

Query Parameters:
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page
- `q` (optional): Search query (searches vendorName, reference, notes)
- `status` (optional): Filter by status (DRAFT, CONFIRMED, CANCELLED)
- `currency` (optional): Filter by currency code (e.g., USD)
- `vendorName` (optional): Filter by vendor name
- `dateFrom` (optional): Filter by purchase date (from)
- `dateTo` (optional): Filter by purchase date (to)

Response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  },
  "summary": {
    "totalAmount": 150000,
    "count": 50
  }
}
```

### 2. Get Purchase Summary
**GET** `/api/finance/purchases/summary`

Query Parameters:
- `status` (optional): Filter by status
- `currency` (optional): Filter by currency
- `vendorName` (optional): Filter by vendor name
- `dateFrom` (optional): Filter by purchase date (from)
- `dateTo` (optional): Filter by purchase date (to)

Response:
```json
{
  "success": true,
  "data": {
    "totalCount": 50,
    "totalAmountCents": 150000,
    "totalsByStatus": {
      "DRAFT": { "count": 10, "totalAmount": 20000 },
      "CONFIRMED": { "count": 35, "totalAmount": 120000 },
      "CANCELLED": { "count": 5, "totalAmount": 10000 }
    },
    "totalsByCurrency": {
      "USD": { "count": 45, "totalAmount": 140000 },
      "EUR": { "count": 5, "totalAmount": 10000 }
    }
  }
}
```

### 3. Create Purchase
**POST** `/api/finance/purchases`

Request Body:
```json
{
  "amount": 50000,           // Required: integer, cents, >= 0
  "currency": "USD",         // Required: 3-char currency code
  "purchaseDate": "2026-01-13T10:00:00Z", // Required: valid date
  "vendorName": "Acme Corp", // Required: non-empty string
  "status": "DRAFT",         // Optional: DRAFT|CONFIRMED|CANCELLED (default: DRAFT)
  "reference": "PO-12345",   // Optional: string
  "notes": "Office supplies" // Optional: string
}
```

Response:
```json
{
  "success": true,
  "message": "Purchase record created successfully",
  "data": { /* purchase object */ }
}
```

### 4. Get Purchase by ID
**GET** `/api/finance/purchases/:id`

Response:
```json
{
  "success": true,
  "data": { /* purchase object */ }
}
```

### 5. Update Purchase
**PATCH** `/api/finance/purchases/:id`

Request Body (all fields optional):
```json
{
  "amount": 55000,
  "currency": "USD",
  "purchaseDate": "2026-01-13T10:00:00Z",
  "vendorName": "Acme Corp Updated",
  "status": "CONFIRMED",
  "reference": "PO-12345-REV",
  "notes": "Updated notes"
}
```

Response:
```json
{
  "success": true,
  "message": "Purchase record updated successfully",
  "data": { /* updated purchase object */ }
}
```

### 6. Delete Purchase (Soft Delete)
**DELETE** `/api/finance/purchases/:id`

Response:
```json
{
  "success": true,
  "message": "Purchase record deleted successfully"
}
```

### 7. Restore Purchase
**POST** `/api/finance/purchases/:id/restore`

Response:
```json
{
  "success": true,
  "message": "Purchase record restored successfully",
  "data": { /* restored purchase object */ }
}
```

## Validation Rules

### Amount
- Required on create
- Must be a non-negative integer (cents)
- Type: `number` (integer)

### Currency
- Required on create
- Must be exactly 3 characters
- Example: "USD", "EUR", "GBP"

### Purchase Date
- Required on create
- Must be a valid ISO date string
- Example: "2026-01-13T10:00:00Z"

### Vendor Name
- Required on create
- Must be a non-empty string after trimming

### Status
- Optional (defaults to "DRAFT")
- Must be one of: `DRAFT`, `CONFIRMED`, `CANCELLED`

### Reference & Notes
- Optional fields
- Strings, nullable

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error message"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Purchase not found"
}
```

## Features

- ✅ Soft delete support (records remain in DB with `deletedAt` timestamp)
- ✅ Full-text search on vendorName, reference, and notes
- ✅ Date range filtering
- ✅ Multi-currency support with aggregations
- ✅ Status-based filtering and reporting
- ✅ Pagination with metadata
- ✅ Audit tracking (createdBy, updatedBy)
- ✅ Summary aggregations by status and currency

## Testing

Run the integration test suite:

```bash
node test-purchase-apis.js
```

The test suite covers:
- ✅ Create purchase (success & validation)
- ✅ List purchases with pagination
- ✅ Get purchase by ID
- ✅ Update purchase
- ✅ Get summary with aggregations
- ✅ Search and filter operations
- ✅ Soft delete and verification
- ✅ Restore deleted purchase
- ✅ Validation tests (amount, currency, vendor, date, status)
- ✅ Authorization checks

### Sample Test Flow

```javascript
// 1. Create purchase
POST /api/finance/purchases
{
  "amount": 50000,              // $500.00 in cents
  "currency": "USD",
  "purchaseDate": "2026-01-13T10:00:00.000Z",
  "vendorName": "Acme Office Supplies",
  "status": "DRAFT",            // Optional: DRAFT|CONFIRMED|CANCELLED
  "reference": "PO-2026-001",   // Optional
  "notes": "Office furniture"   // Optional
}

// 2. List purchases
GET /api/finance/purchases?page=1&limit=10&status=CONFIRMED

// 3. Update purchase
PATCH /api/finance/purchases/{id}
{
  "amount": 55000,
  "status": "CONFIRMED",
  "notes": "Updated after review"
}

// 4. Get summary
GET /api/finance/purchases/summary?dateFrom=2026-01-01

// 5. Soft delete
DELETE /api/finance/purchases/{id}
```
