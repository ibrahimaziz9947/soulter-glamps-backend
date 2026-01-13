# Payables API - cURL Examples

## Prerequisites
First, login and get an admin token:
```bash
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@soulter.com","password":"admin123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

---

## 1. List Payables (Default: UNPAID & PARTIAL only)

### Basic list
```bash
curl -X GET "http://localhost:5001/api/finance/payables" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Sample Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "amount": 100000,
      "currency": "USD",
      "purchaseDate": "2026-01-13T15:04:03.000Z",
      "vendorName": "Acme Corp",
      "status": "CONFIRMED",
      "reference": "PO-001",
      "notes": "Office supplies",
      "paymentStatus": "UNPAID",
      "paidAmountCents": 0,
      "dueDate": "2026-02-13T00:00:00.000Z",
      "paidAt": null,
      "outstandingCents": 100000,
      "createdBy": {
        "id": "user-uuid",
        "name": "Admin User",
        "email": "admin@soulter.com",
        "role": "ADMIN"
      },
      "createdAt": "2026-01-13T15:04:03.000Z",
      "updatedAt": "2026-01-13T15:04:03.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### With filters
```bash
# Search by vendor name or reference
curl -X GET "http://localhost:5001/api/finance/payables?q=acme" \
  -H "Authorization: Bearer $TOKEN"

# Filter by currency
curl -X GET "http://localhost:5001/api/finance/payables?currency=USD" \
  -H "Authorization: Bearer $TOKEN"

# Filter by date range
curl -X GET "http://localhost:5001/api/finance/payables?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN"

# Filter by due date range
curl -X GET "http://localhost:5001/api/finance/payables?dueFrom=2026-02-01&dueTo=2026-02-28" \
  -H "Authorization: Bearer $TOKEN"

# Show only UNPAID
curl -X GET "http://localhost:5001/api/finance/payables?status=UNPAID" \
  -H "Authorization: Bearer $TOKEN"

# Show PAID payables
curl -X GET "http://localhost:5001/api/finance/payables?status=PAID" \
  -H "Authorization: Bearer $TOKEN"

# Pagination and sorting
curl -X GET "http://localhost:5001/api/finance/payables?page=2&pageSize=10&sortBy=dueDate&sortOrder=asc" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 2. Get Payables Summary

```bash
curl -X GET "http://localhost:5001/api/finance/payables/summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "totalCount": 5,
    "totalOutstandingCents": 450000,
    "totalsByStatus": {
      "UNPAID": {
        "count": 3,
        "outstandingCents": 300000
      },
      "PARTIAL": {
        "count": 2,
        "outstandingCents": 150000
      }
    },
    "totalsByCurrency": {
      "USD": {
        "count": 4,
        "outstandingCents": 400000
      },
      "EUR": {
        "count": 1,
        "outstandingCents": 50000
      }
    }
  }
}
```

### Summary with filters
```bash
# Summary for specific vendor
curl -X GET "http://localhost:5001/api/finance/payables/summary?q=acme" \
  -H "Authorization: Bearer $TOKEN"

# Summary for specific currency
curl -X GET "http://localhost:5001/api/finance/payables/summary?currency=USD" \
  -H "Authorization: Bearer $TOKEN"

# Summary for overdue items (dueDate before today)
curl -X GET "http://localhost:5001/api/finance/payables/summary?dueTo=$(date -I)" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Record Payment

### Partial Payment
```bash
curl -X POST "http://localhost:5001/api/finance/payables/{purchaseId}/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCents": 50000
  }'
```

**Sample Response (Partial Payment):**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "id": "uuid-here",
    "amount": 100000,
    "currency": "USD",
    "purchaseDate": "2026-01-13T15:04:03.000Z",
    "vendorName": "Acme Corp",
    "status": "CONFIRMED",
    "reference": "PO-001",
    "paymentStatus": "PARTIAL",
    "paidAmountCents": 50000,
    "dueDate": "2026-02-13T00:00:00.000Z",
    "paidAt": null,
    "outstandingCents": 50000,
    "paymentRecorded": 50000,
    "updatedBy": {
      "id": "user-uuid",
      "name": "Admin User",
      "email": "admin@soulter.com",
      "role": "ADMIN"
    },
    "updatedAt": "2026-01-13T15:30:00.000Z"
  }
}
```

### Final Payment (Full)
```bash
curl -X POST "http://localhost:5001/api/finance/payables/{purchaseId}/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCents": 50000
  }'
```

**Sample Response (Full Payment):**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "id": "uuid-here",
    "amount": 100000,
    "paymentStatus": "PAID",
    "paidAmountCents": 100000,
    "paidAt": "2026-01-13T15:35:00.000Z",
    "outstandingCents": 0,
    "paymentRecorded": 50000
  }
}
```

---

## Error Cases

### 1. Invalid payment amount (negative or zero)
```bash
curl -X POST "http://localhost:5001/api/finance/payables/{purchaseId}/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents": -5000}'
```

**Response (400):**
```json
{
  "success": false,
  "error": "Payment amount must be greater than zero"
}
```

### 2. Overpayment attempt
```bash
curl -X POST "http://localhost:5001/api/finance/payables/{purchaseId}/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents": 200000}'
```

**Response (400):**
```json
{
  "success": false,
  "error": "Payment amount (200000) exceeds outstanding balance (100000)"
}
```

### 3. Already fully paid
```bash
curl -X POST "http://localhost:5001/api/finance/payables/{purchaseId}/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents": 1000}'
```

**Response (400):**
```json
{
  "success": false,
  "error": "This purchase is already fully paid"
}
```

### 4. Purchase not found
```bash
curl -X POST "http://localhost:5001/api/finance/payables/invalid-uuid/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents": 50000}'
```

**Response (404):**
```json
{
  "success": false,
  "error": "Purchase not found"
}
```

---

## Complete Payment Workflow Example

### Step 1: Create a purchase
```bash
PURCHASE_ID=$(curl -s -X POST http://localhost:5001/api/finance/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "currency": "USD",
    "purchaseDate": "2026-01-13",
    "vendorName": "Test Vendor",
    "status": "CONFIRMED",
    "dueDate": "2026-02-13"
  }' | jq -r '.data.id')

echo "Created Purchase ID: $PURCHASE_ID"
```

### Step 2: Verify it appears in payables
```bash
curl -X GET "http://localhost:5001/api/finance/payables" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | select(.id == "'$PURCHASE_ID'")'
```

### Step 3: Make partial payment ($400)
```bash
curl -X POST "http://localhost:5001/api/finance/payables/$PURCHASE_ID/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents": 40000}' | jq
```

### Step 4: Check updated status (should be PARTIAL)
```bash
curl -X GET "http://localhost:5001/api/finance/payables" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | select(.id == "'$PURCHASE_ID'") | {paymentStatus, paidAmountCents, outstandingCents}'
```

### Step 5: Make final payment ($600)
```bash
curl -X POST "http://localhost:5001/api/finance/payables/$PURCHASE_ID/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents": 60000}' | jq
```

### Step 6: Verify no longer in default payables list (PAID)
```bash
curl -X GET "http://localhost:5001/api/finance/payables" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | select(.id == "'$PURCHASE_ID'")'
# Should return nothing (empty)
```

### Step 7: Verify appears when explicitly requesting PAID
```bash
curl -X GET "http://localhost:5001/api/finance/payables?status=PAID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | select(.id == "'$PURCHASE_ID'")'
```

---

## Testing with PowerShell (Windows)

```powershell
# Login and get token
$response = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@soulter.com","password":"admin123"}'

$token = $response.token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# List payables
Invoke-RestMethod -Uri "http://localhost:5001/api/finance/payables" `
  -Method GET `
  -Headers $headers

# Get summary
Invoke-RestMethod -Uri "http://localhost:5001/api/finance/payables/summary" `
  -Method GET `
  -Headers $headers

# Record payment
Invoke-RestMethod -Uri "http://localhost:5001/api/finance/payables/{purchaseId}/pay" `
  -Method POST `
  -Headers $headers `
  -Body '{"amountCents":50000}'
```
