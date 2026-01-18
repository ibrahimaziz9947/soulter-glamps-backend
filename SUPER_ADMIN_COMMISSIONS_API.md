# Super Admin Commissions API Documentation

**Base URL:** `/api/super-admin/commissions`  
**Authentication:** SUPER_ADMIN role required  
**Authorization:** Bearer token in `Authorization` header

---

## Quick Start cURL Commands

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"Password123!"}' \
  | jq -r '.token')

# 2. List all commissions (default: last 30 days)
curl -X GET "http://localhost:5001/api/super-admin/commissions" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 3. Get unpaid commissions for January 2026
curl -X GET "http://localhost:5001/api/super-admin/commissions?from=2026-01-01&to=2026-01-31&status=UNPAID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 4. Get commission details
curl -X GET "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 5. Mark commission as paid
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paidAt": "2026-01-19T14:30:00Z",
    "paymentMethod": "TRANSFER",
    "reference": "TXN-12345"
  }' | jq '.'

# 6. Revert to unpaid (if needed)
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-unpaid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Payment reversed"}' | jq '.'
```

---

## Overview

The Super Admin Commissions API provides comprehensive commission management capabilities including:
- List all commissions with advanced filtering (date range, status, agent, booking, search)
- Pagination and sorting
- Detailed commission information with agent and booking relations
- Mark commissions as PAID or revert to UNPAID
- Real-time aggregations (pending/paid counts and amounts)

---

## Endpoints

### 1. GET `/api/super-admin/commissions`
Get all commissions with filtering, pagination, search, and aggregations.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `from` | string | No | 30 days ago | Start date (YYYY-MM-DD or ISO datetime) |
| `to` | string | No | now | End date (YYYY-MM-DD or ISO datetime) |
| `status` | string | No | - | Filter by status: `UNPAID`, `PAID`, `PENDING`, or `ALL` (no filter) |
| `agentId` | string | No | - | Filter by agent UUID |
| `bookingId` | string | No | - | Filter by booking UUID |
| `search` | string | No | - | Search term (matches agent name/email, commission ID, booking ID) |
| `page` | number | No | 1 | Page number (1-indexed) |
| `limit` | number | No | 20 | Items per page (max 100) |
| `sort` | string | No | `createdAt_desc` | Sort format: `field_direction` (e.g., `createdAt_asc`, `amount_desc`) |

#### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "createdAt": "2026-01-15T10:30:00.000Z",
        "status": "UNPAID",
        "amount": 50000,
        "bookingId": "booking-uuid",
        "agent": {
          "id": "agent-uuid",
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    ],
    "meta": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "range": {
      "from": "2025-12-16T00:00:00.000Z",
      "to": "2026-01-15T23:59:59.999Z"
    },
    "aggregates": {
      "pendingCount": 25,
      "pendingAmountCents": 125000,
      "paidCount": 75,
      "paidAmountCents": 375000,
      "totalAmountCents": 500000
    }
  }
}
```

#### Example Requests

**Default (last 30 days, all statuses):**
```bash
curl -X GET "http://localhost:5001/api/super-admin/commissions" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**With date range and status filter:**
```bash
curl -X GET "http://localhost:5001/api/super-admin/commissions?from=2026-01-01&to=2026-01-31&status=UNPAID&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Search by agent name/email:**
```bash
curl -X GET "http://localhost:5001/api/super-admin/commissions?search=john&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Filter by specific agent:**
```bash
curl -X GET "http://localhost:5001/api/super-admin/commissions?agentId=agent-uuid-here" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Sort by amount descending:**
```bash
curl -X GET "http://localhost:5001/api/super-admin/commissions?sort=amount_desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. GET `/api/super-admin/commissions/:id`
Get single commission with full details including booking and agent relations.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Commission UUID |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "commission-uuid",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "status": "UNPAID",
    "amount": 50000,
    "bookingId": "booking-uuid",
    "agent": {
      "id": "agent-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "booking": {
      "id": "booking-uuid",
      "customerName": "Jane Smith",
      "checkInDate": "2026-02-01T00:00:00.000Z",
      "checkOutDate": "2026-02-03T00:00:00.000Z",
      "totalAmount": 250000,
      "status": "CONFIRMED",
      "glamp": {
        "id": "glamp-uuid",
        "name": "Luxury Safari Tent"
      }
    }
  }
}
```

#### Example Request

```bash
curl -X GET "http://localhost:5001/api/super-admin/commissions/commission-uuid-here" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Error Responses

**404 Not Found:**
```json
{
  "success": false,
  "error": "Commission not found"
}
```

---

### 3. POST `/api/super-admin/commissions/:id/mark-paid`
Mark a commission as PAID with optional payment metadata.

**Status Transition Rules:**
- ✅ **UNPAID → PAID**: Allowed, commission will be marked as paid
- ✅ **PAID → PAID**: Idempotent, returns existing record (200 OK)
- ❌ **Other statuses**: Will return 400 error

**Idempotent Operation:**  
Calling this endpoint multiple times on a PAID commission will succeed (200 OK) and return the commission details. This allows safe retries without errors.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Commission UUID |

#### Request Body

```json
{
  "paidAt": "2026-01-15T14:30:00Z",
  "note": "Payment processed via bank transfer",
  "paymentMethod": "TRANSFER",
  "reference": "TXN-123456789"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paidAt` | string | No | ISO datetime when payment was made |
| `note` | string | No | Optional payment note |
| `paymentMethod` | string | No | Payment method (TRANSFER, CHECK, CASH, etc.) |
| `reference` | string | No | Payment reference/transaction ID |

**Note:** Payment metadata is logged but not stored in the database unless you extend the schema with fields like `paidAt`, `paymentMethod`, `paymentNote`, `reference`.

#### Response

```json
{
  "success": true,
  "message": "Commission marked as paid successfully",
  "data": {
    "id": "commission-uuid",
    "status": "PAID",
    "amount": 50000,
    "createdAt": "2026-01-10T10:00:00.000Z",
    "bookingId": "booking-uuid",
    "agent": {
      "id": "agent-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "booking": {
      "id": "booking-uuid",
      "customerName": "Jane Smith",
      "checkInDate": "2026-02-01T00:00:00.000Z",
      "checkOutDate": "2026-02-03T00:00:00.000Z",
      "totalAmount": 250000,
      "status": "CONFIRMED",
      "glamp": {
        "id": "glamp-uuid",
        "name": "Luxury Safari Tent"
      }
    }
  }
}
```

#### Sample cURL Commands

**Basic mark as paid:**
```bash
# Step 1: Login and get token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"Password123!"}' \
  | jq -r '.token')

# Step 2: Mark commission as paid
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**With payment metadata:**
```bash
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paidAt": "2026-01-19T14:30:00Z",
    "note": "Wire transfer completed successfully",
    "paymentMethod": "TRANSFER",
    "reference": "WIRE-2026-01-12345"
  }'
```

**Windows PowerShell:**
```powershell
# Step 1: Login
$login = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"superadmin@example.com","password":"Password123!"}'

$token = $login.token

# Step 2: Mark as paid
$body = @{
  paidAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  note = "Payment completed"
  paymentMethod = "TRANSFER"
  reference = "TXN-12345"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-paid" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body $body
```

#### Error Responses

**404 Not Found:**
```json
{
  "success": false,
  "error": "Commission not found"
}
```

**400 Bad Request (invalid status transition):**
```json
{
  "success": false,
  "error": "Cannot mark commission as paid. Current status is PAID. Only UNPAID commissions can be marked as paid."
}
```

**400 Bad Request (invalid paidAt format):**
```json
{
  "success": false,
  "error": "Invalid paidAt date format. Use ISO datetime (e.g., 2026-01-15T10:30:00Z)"
}
```

---

### 4. POST `/api/super-admin/commissions/:id/mark-unpaid`
Revert a commission from PAID to UNPAID status.

**Status Transition Rules:**
- ✅ **PAID → UNPAID**: Allowed (reversal operation for corrections)
- ❌ **UNPAID → UNPAID**: Error, already unpaid
- ❌ **Other statuses**: Will return 400 error

**Use Case:**  
This endpoint allows correcting mistaken payment markings or handling payment reversals.

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Commission UUID |

#### Request Body

```json
{
  "reason": "Payment reversed due to failed transaction"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | No | Optional reason for reverting to unpaid |

#### Response

```json
{
  "success": true,
  "message": "Commission marked as unpaid successfully",
  "data": {
    "id": "commission-uuid",
    "status": "UNPAID",
    "amount": 50000,
    "createdAt": "2026-01-10T10:00:00.000Z",
    "bookingId": "booking-uuid",
    "agent": {
      "id": "agent-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "booking": {
      "id": "booking-uuid",
      "customerName": "Jane Smith",
      "checkInDate": "2026-02-01T00:00:00.000Z",
      "checkOutDate": "2026-02-03T00:00:00.000Z",
      "totalAmount": 250000,
      "status": "CONFIRMED",
      "glamp": {
        "id": "glamp-uuid",
        "name": "Luxury Safari Tent"
      }
    }
  }
}
```

#### Sample cURL Commands

**Basic mark as unpaid:**
```bash
# Using token from login
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-unpaid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**With reason:**
```bash
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-unpaid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Payment was reversed by bank due to insufficient funds"
  }'
```

**Windows PowerShell:**
```powershell
$body = @{
  reason = "Payment reversal - bank rejected transaction"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-unpaid" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body $body
```

#### Error Responses

**404 Not Found:**
```json
{
  "success": false,
  "error": "Commission not found"
}
```

**400 Bad Request (commission not PAID):**
```json
{
  "success": false,
  "error": "Cannot mark commission as unpaid. Current status is UNPAID. Only PAID commissions can be reverted to UNPAID."
}
```

---

## Complete cURL Workflow Examples

### Example 1: List and Pay a Commission

```bash
#!/bin/bash

# Step 1: Login as Super Admin
echo "=== Step 1: Login ==="
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"Password123!"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# Step 2: Get all unpaid commissions
echo -e "\n=== Step 2: Get Unpaid Commissions ==="
COMMISSIONS=$(curl -s -X GET "http://localhost:5001/api/super-admin/commissions?status=UNPAID&limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo "$COMMISSIONS" | jq '.'

# Step 3: Extract first commission ID
COMMISSION_ID=$(echo "$COMMISSIONS" | jq -r '.data.items[0].id')
echo -e "\n=== Step 3: Selected Commission ID ==="
echo "$COMMISSION_ID"

# Step 4: Get commission details
echo -e "\n=== Step 4: Get Commission Details ==="
curl -s -X GET "http://localhost:5001/api/super-admin/commissions/$COMMISSION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Step 5: Mark as paid
echo -e "\n=== Step 5: Mark as Paid ==="
curl -s -X POST "http://localhost:5001/api/super-admin/commissions/$COMMISSION_ID/mark-paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paidAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "note": "Payment via wire transfer",
    "paymentMethod": "TRANSFER",
    "reference": "WIRE-2026-001"
  }' | jq '.'

# Step 6: Verify payment status
echo -e "\n=== Step 6: Verify Status ==="
curl -s -X GET "http://localhost:5001/api/super-admin/commissions/$COMMISSION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.status'
```

### Example 2: Search and Filter Commissions

```bash
# Get all commissions for a specific date range
curl -X GET "http://localhost:5001/api/super-admin/commissions?from=2026-01-01&to=2026-01-31&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Search by agent name
curl -X GET "http://localhost:5001/api/super-admin/commissions?search=john&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Get commissions for specific agent
curl -X GET "http://localhost:5001/api/super-admin/commissions?agentId=AGENT_UUID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Get paid commissions sorted by amount descending
curl -X GET "http://localhost:5001/api/super-admin/commissions?status=PAID&sort=amount_desc&limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Example 3: Complete PowerShell Workflow

```powershell
# Complete workflow in PowerShell
Write-Host "=== Super Admin Commissions Workflow ===" -ForegroundColor Cyan

# Step 1: Login
Write-Host "`n1. Logging in..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"superadmin@example.com","password":"Password123!"}'

$token = $loginResponse.token
Write-Host "   Token obtained" -ForegroundColor Green

# Step 2: Get unpaid commissions
Write-Host "`n2. Fetching unpaid commissions..." -ForegroundColor Yellow
$commissions = Invoke-RestMethod -Uri "http://localhost:5001/api/super-admin/commissions?status=UNPAID&limit=5" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token" }

Write-Host "   Found: $($commissions.data.meta.total) unpaid commissions" -ForegroundColor Green
Write-Host "   Pending amount: $([math]::Round($commissions.data.aggregates.pendingAmountCents / 100, 2)) USD" -ForegroundColor Green

# Step 3: Get first commission details
if ($commissions.data.items.Count -gt 0) {
    $commissionId = $commissions.data.items[0].id
    Write-Host "`n3. Getting details for commission: $commissionId" -ForegroundColor Yellow
    
    $detail = Invoke-RestMethod -Uri "http://localhost:5001/api/super-admin/commissions/$commissionId" `
      -Method GET `
      -Headers @{ Authorization = "Bearer $token" }
    
    Write-Host "   Agent: $($detail.data.agent.name)" -ForegroundColor Green
    Write-Host "   Amount: $([math]::Round($detail.data.amount / 100, 2)) USD" -ForegroundColor Green
    
    # Step 4: Mark as paid
    Write-Host "`n4. Marking commission as paid..." -ForegroundColor Yellow
    
    $paymentData = @{
        paidAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        note = "Payment processed successfully"
        paymentMethod = "TRANSFER"
        reference = "PS-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    } | ConvertTo-Json
    
    $paid = Invoke-RestMethod -Uri "http://localhost:5001/api/super-admin/commissions/$commissionId/mark-paid" `
      -Method POST `
      -Headers @{ Authorization = "Bearer $token" } `
      -ContentType "application/json" `
      -Body $paymentData
    
    Write-Host "   Status: $($paid.data.status)" -ForegroundColor Green
    Write-Host "   Message: $($paid.message)" -ForegroundColor Green
}

Write-Host "`n=== Workflow Complete ===" -ForegroundColor Cyan
```

---

## Data Types

### Commission Object

```typescript
{
  id: string;              // UUID
  createdAt: string;       // ISO datetime
  status: string;          // UNPAID | PAID | PENDING
  amount: number;          // Amount in cents (e.g., 50000 = $500.00)
  bookingId: string;       // UUID
  agent: {
    id: string;
    name: string;
    email: string;
  };
  booking?: {              // Optional, included in detail view
    id: string;
    customerName: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number;
    status: string;
    glamp: {
      id: string;
      name: string;
    };
  };
}
```

### Aggregates Object

```typescript
{
  pendingCount: number;          // Count of commissions with PENDING status
  pendingAmountCents: number;    // Sum of amounts for PENDING commissions
  paidCount: number;             // Count of commissions with PAID status
  paidAmountCents: number;       // Sum of amounts for PAID commissions
  totalAmountCents: number;      // Sum of all commission amounts in the filtered dataset
}
```

---

## Error Handling

All endpoints follow the standard error response format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User does not have SUPER_ADMIN role |
| 404 | Not Found | Commission not found |
| 400 | Bad Request | Invalid parameters or business logic error |
| 500 | Internal Server Error | Server-side error |

---

## Testing

Use the provided test script to verify all endpoints:

```bash
# Set environment variables (optional)
export API_URL=http://localhost:5001
export SUPER_ADMIN_EMAIL=superadmin@example.com
export SUPER_ADMIN_PASSWORD=Password123!

# Run tests
node test-super-admin-commissions.js
```

---

## Implementation Notes

### Architecture

The implementation follows the existing project patterns:

1. **Service Layer** (`super-admin-commissions.service.js`)
   - Database operations using Prisma
   - Business logic and validations
   - Reusable service functions

2. **Controller Layer** (`super-admin-commissions.controller.js`)
   - Request parsing and validation
   - Calls service layer
   - Response formatting

3. **Routes Layer** (`super-admin-commissions.routes.js`)
   - Endpoint definitions
   - Middleware application (authRequired, requireSuperAdmin)

### Middleware

- `authRequired`: Validates JWT token and attaches user to request
- `requireSuperAdmin`: Ensures user has SUPER_ADMIN role

### Utilities Used

- `parseDateRange`: Consistent date range parsing (inclusive end-of-day)
- `getPagination`: Calculates skip/take for Prisma
- `getPaginationMeta`: Generates pagination metadata
- `asyncHandler`: Wraps async controllers for error handling

### Database Schema

Uses the existing `Commission` model from Prisma schema:

```prisma
model Commission {
  id     String           @id @default(uuid())
  amount Int              // Commission amount in smallest currency unit
  status CommissionStatus @default(UNPAID)
  
  agent   User   @relation(fields: [agentId], references: [id], onDelete: Cascade)
  agentId String
  
  booking   Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  bookingId String  @unique
  
  createdAt DateTime @default(now())
  
  @@index([agentId])
  @@index([bookingId])
  @@index([status])
}

enum CommissionStatus {
  UNPAID
  PAID
}
```

### Future Enhancements

If you need to add payment metadata fields to the schema:

```prisma
model Commission {
  // ... existing fields ...
  paidAt        DateTime?
  paymentMethod String?
  paymentNote   String?
  reference     String?
}
```

Then update the `markCommissionAsPaid` service function to store these fields.

---

## Security

- All endpoints require authentication via JWT token
- All endpoints require SUPER_ADMIN role
- Input validation on all parameters
- SQL injection protection via Prisma parameterization
- No sensitive data exposed in error messages

---

## Performance

- Efficient Prisma queries with proper indexes
- Parallel execution of independent queries (items + count + aggregates)
- Pagination to limit data transfer
- Aggregates calculated at database level

---

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify authentication token is valid
3. Ensure user has SUPER_ADMIN role
4. Review request parameters against this documentation
