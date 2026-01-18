# Commissions API - Business Rules Reference

## Status Transition Rules

### Mark as PAID (`POST /mark-paid`)

| Current Status | Allowed? | Behavior | HTTP Status |
|----------------|----------|----------|-------------|
| **UNPAID** | ✅ Yes | Commission marked as PAID | 200 OK |
| **PAID** | ✅ Yes | **Idempotent** - Returns existing record | 200 OK |
| Other | ❌ No | Error: Invalid status transition | 400 Bad Request |

**Idempotent Operation:**  
Calling mark-paid multiple times on a PAID commission succeeds without errors. This allows safe retries.

**Payment Metadata:**  
Optional fields (`paidAt`, `note`, `paymentMethod`, `reference`) are logged but not stored in database unless schema is extended with these fields.

---

### Mark as UNPAID (`POST /mark-unpaid`)

| Current Status | Allowed? | Behavior | HTTP Status |
|----------------|----------|----------|-------------|
| **PAID** | ✅ Yes | Commission reverted to UNPAID | 200 OK |
| **UNPAID** | ❌ No | Error: Already unpaid | 400 Bad Request |
| Other | ❌ No | Error: Invalid status transition | 400 Bad Request |

**Use Case:**  
Correcting mistaken payment markings or handling payment reversals.

**Reversal Metadata:**  
Optional `reason` field is logged but not stored unless schema is extended.

---

## Commission Statuses (Schema)

Based on the Prisma schema, Commission has only 2 statuses:

```prisma
enum CommissionStatus {
  UNPAID  // Default status when commission is created
  PAID    // Status after successful payment marking
}
```

---

## Aggregates Calculation

Aggregates are calculated across **ALL filtered records**, not just the current page:

| Aggregate | Description | Filter Applied |
|-----------|-------------|----------------|
| `pendingCount` | Count of UNPAID commissions | `status = 'UNPAID'` |
| `pendingAmountCents` | Sum of UNPAID commission amounts | `status = 'UNPAID'` |
| `paidCount` | Count of PAID commissions | `status = 'PAID'` |
| `paidAmountCents` | Sum of PAID commission amounts | `status = 'PAID'` |
| `totalAmountCents` | Sum of ALL commissions | All statuses |

**Important:**  
- All aggregates use the same date range and filters as the list query
- Amounts are in **cents** (integer values, never scaled)
- Aggregates are computed at database level using Prisma aggregate queries

---

## Date Filtering

- **Field Used:** `createdAt` (commission creation date)
- **Default Range:** Last 30 days
- **End Date Inclusive:** `to` date includes end of day (23:59:59.999)
- **Format:** YYYY-MM-DD or ISO datetime

**Example:**
```bash
# January 2026 (inclusive)
from=2026-01-01  # 2026-01-01T00:00:00.000Z
to=2026-01-31    # 2026-01-31T23:59:59.999Z
```

---

## Search Behavior

Search term is matched against (case-insensitive, partial match):

1. **Commission ID** (UUID)
2. **Agent Name** (via relation)
3. **Agent Email** (via relation)
4. **Booking ID** (UUID)

**Logic:** OR condition across all fields

**Example:**
```bash
search=john
# Matches:
# - Agent name: "John Doe"
# - Agent email: "john@example.com"
# - Commission ID containing "john"
# - Booking ID containing "john"
```

---

## Error Handling

### 404 Not Found
```json
{
  "success": false,
  "error": "Commission not found"
}
```

**Causes:**
- Invalid commission UUID
- Commission doesn't exist in database

---

### 400 Bad Request

**Invalid status transition (mark-paid):**
```json
{
  "success": false,
  "error": "Cannot mark commission as paid. Current status is PAID. Only UNPAID commissions can be marked as paid."
}
```

**Invalid status transition (mark-unpaid):**
```json
{
  "success": false,
  "error": "Cannot mark commission as unpaid. Current status is UNPAID. Only PAID commissions can be reverted to UNPAID."
}
```

**Invalid date format:**
```json
{
  "success": false,
  "error": "Invalid paidAt date format. Use ISO datetime (e.g., 2026-01-15T10:30:00Z)"
}
```

---

## Transaction Handling

**Current Implementation:**
- Single database operation per mark-paid/mark-unpaid
- No related ledger or payable entries updated
- No Prisma transaction needed

**Future Enhancement:**
If your system needs to update related tables (e.g., ledger entries, payables), wrap operations in Prisma transaction:

```javascript
await prisma.$transaction(async (tx) => {
  // Update commission
  await tx.commission.update({...});
  
  // Update related ledger entry
  await tx.ledgerEntry.create({...});
  
  // Update related payable
  await tx.payable.update({...});
});
```

---

## Response Format

All endpoints return consistent JSON:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Idempotency

### Mark as PAID - Idempotent ✅

Calling multiple times with same commission ID:
- 1st call: UNPAID → PAID (updates status)
- 2nd call: PAID → PAID (returns existing, no error)
- 3rd call: PAID → PAID (returns existing, no error)

**HTTP Status:** Always 200 OK  
**Use Case:** Safe retries in case of network failures

### Mark as UNPAID - NOT Idempotent ❌

Calling multiple times with same commission ID:
- 1st call: PAID → UNPAID (updates status)
- 2nd call: UNPAID → UNPAID (returns 400 error)

**Reason:** Prevents accidental multiple reversals

---

## Schema Extensions (Optional)

To store payment metadata in database, extend the Commission model:

```prisma
model Commission {
  id        String           @id @default(uuid())
  amount    Int
  status    CommissionStatus @default(UNPAID)
  agentId   String
  bookingId String           @unique
  createdAt DateTime         @default(now())
  
  // NEW: Payment metadata fields
  paidAt        DateTime? // When payment was made
  paymentMethod String?   // TRANSFER, CHECK, CASH, etc.
  paymentNote   String?   // Payment notes
  reference     String?   // Transaction reference
  processedBy   String?   // Admin who processed payment
  
  agent   User    @relation(...)
  booking Booking @relation(...)
}
```

Then update the service to use these fields:

```javascript
await prisma.commission.update({
  where: { id },
  data: {
    status: 'PAID',
    paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
    paymentMethod: data.paymentMethod,
    paymentNote: data.note,
    reference: data.reference,
    processedBy: req.user.id, // From auth middleware
  },
});
```

---

## Quick Reference Table

| Action | Endpoint | Method | Auth | Idempotent |
|--------|----------|--------|------|------------|
| List commissions | `/api/super-admin/commissions` | GET | SUPER_ADMIN | N/A |
| Get details | `/api/super-admin/commissions/:id` | GET | SUPER_ADMIN | N/A |
| Mark paid | `/api/super-admin/commissions/:id/mark-paid` | POST | SUPER_ADMIN | ✅ Yes |
| Mark unpaid | `/api/super-admin/commissions/:id/mark-unpaid` | POST | SUPER_ADMIN | ❌ No |

---

## Testing Commands

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"Password123!"}' \
  | jq -r '.token')

# List unpaid commissions
curl -X GET "http://localhost:5001/api/super-admin/commissions?status=UNPAID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.aggregates'

# Mark as paid (first time - updates status)
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note":"First payment"}' | jq '.data.status'

# Mark as paid (second time - idempotent, returns same)
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note":"Retry"}' | jq '.data.status'

# Revert to unpaid
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-unpaid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Reversal"}' | jq '.data.status'

# Try to revert again (will fail with 400)
curl -X POST "http://localhost:5001/api/super-admin/commissions/COMMISSION_UUID/mark-unpaid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Second try"}' | jq '.'
```

---

**Last Updated:** January 19, 2026
