# Super Admin Finance API - Implementation Documentation

## 🎯 Strategy: Zero Duplication

**Key Principle:** The Super Admin Finance module reuses **100% of existing finance logic** with zero duplication.

All endpoints under `/api/super-admin/finance/*` directly mount the same route modules used by `/api/finance/*`:
- Same controllers
- Same services  
- Same Prisma queries
- Same business logic
- Same validations

**Why this works:**  
The existing finance routes use `requireAdmin` middleware, which already allows both `ADMIN` and `SUPER_ADMIN` roles. We're simply mounting these routes under the super-admin namespace for organizational consistency.

---

## 📦 Existing Finance Modules (All Reused)

### 1. **Dashboard** (`finance/dashboard`)
- Financial KPIs (income, expenses, profit, payables, cash flow)
- Recent transactions
- Date range filtering

### 2. **Profit & Loss** (`finance/profitLoss`)
- Full P&L statement with breakdown
- Income vs Expenses
- Net profit calculation
- Summary endpoint

### 3. **Statements/Ledger** (`finance/statements`)
- Chronological list of all transactions
- Includes income, expenses, purchases
- Date range filtering
- Pagination support

### 4. **Expenses** (`finance/expenses`)
- Full CRUD operations
- Workflow: Draft → Submit → Approve/Reject
- Cancel functionality
- Category assignment
- Receipt attachments

### 5. **Income** (`finance/income`)
- Full CRUD operations
- Soft delete + restore
- Summary endpoint
- Booking-linked income
- Manual income entries

### 6. **Purchases** (`finance/purchases`)
- Full CRUD operations
- Soft delete + restore
- Summary endpoint
- Payment status tracking (UNPAID, PARTIAL, PAID)

### 7. **Payables** (`finance/payables`)
- List all unpaid/partial purchases
- Summary (total due, overdue amounts)
- Record payment functionality

### 8. **Categories** (`finance/categories`)
- List all expense categories
- Used for categorizing expenses

---

## 🔗 Super Admin Finance Endpoints

All endpoints are accessible at `/api/super-admin/finance/*`

### Authentication
- **Required:** Bearer token in `Authorization` header
- **Role:** SUPER_ADMIN only

---

## 📋 Complete Endpoint List

### **Summary Endpoint (Super Admin Specific)**
```
GET /api/super-admin/finance/summary
- Query: from, to (optional, defaults to last 30 days)
- Returns: Combined P&L, ledger, payables, receivables summary

GET /api/super-admin/finance/ping
- No parameters
- Returns: Health check status and database connectivity
```

### **Dashboard**
```
GET /api/super-admin/finance/dashboard
- Query: from, to, currency, limit
- Returns: KPIs + recent transactions
```

### **Profit & Loss**
```
GET /api/super-admin/finance/profit-loss
- Query: from, to, currency
- Returns: Full P&L statement with breakdown

GET /api/super-admin/finance/profit-loss/summary
- Query: from, to
- Returns: Quick summary (total income, expenses, net profit)
```

### **Statements (Ledger)**
```
GET /api/super-admin/finance/statements
- Query: from, to, type, page, pageSize
- Returns: Chronological list of all transactions
```

### **Expenses**
```
POST   /api/super-admin/finance/expenses              - Create
GET    /api/super-admin/finance/expenses              - List
GET    /api/super-admin/finance/expenses/:id          - Get details
PATCH  /api/super-admin/finance/expenses/:id          - Update
DELETE /api/super-admin/finance/expenses/:id          - Delete

POST   /api/super-admin/finance/expenses/:id/submit   - Submit for approval
POST   /api/super-admin/finance/expenses/:id/approve  - Approve
POST   /api/super-admin/finance/expenses/:id/reject   - Reject
POST   /api/super-admin/finance/expenses/:id/cancel   - Cancel
```

### **Income**
```
POST   /api/super-admin/finance/income                - Create
GET    /api/super-admin/finance/income                - List
GET    /api/super-admin/finance/income/summary        - Get summary
GET    /api/super-admin/finance/income/:id            - Get details
PATCH  /api/super-admin/finance/income/:id            - Update
DELETE /api/super-admin/finance/income/:id            - Soft delete
POST   /api/super-admin/finance/income/:id/restore    - Restore
```

### **Purchases**
```
POST   /api/super-admin/finance/purchases             - Create
GET    /api/super-admin/finance/purchases             - List
GET    /api/super-admin/finance/purchases/summary     - Get summary
GET    /api/super-admin/finance/purchases/:id         - Get details
PATCH  /api/super-admin/finance/purchases/:id         - Update
DELETE /api/super-admin/finance/purchases/:id         - Soft delete
POST   /api/super-admin/finance/purchases/:id/restore - Restore
```

### **Payables**
```
GET    /api/super-admin/finance/payables              - List payables
GET    /api/super-admin/finance/payables/summary      - Get summary
POST   /api/super-admin/finance/payables/:purchaseId/pay - Record payment
```

### **Categories**
```
GET /api/super-admin/finance/categories - List all expense categories
```

---

## 🧪 Sample cURL Commands

### Get Comprehensive Financial Summary
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"Password123!"}' \
  | jq -r '.token')

# Get summary (last 30 days)
curl -X GET "http://localhost:5001/api/super-admin/finance/summary" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Get summary for specific date range
curl -X GET "http://localhost:5001/api/super-admin/finance/summary?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Health Check
```bash
curl -X GET "http://localhost:5001/api/super-admin/finance/ping" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Get Financial Dashboard
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"Password123!"}' \
  | jq -r '.token')

# Get dashboard (last 30 days)
curl -X GET "http://localhost:5001/api/super-admin/finance/dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Get dashboard for specific date range
curl -X GET "http://localhost:5001/api/super-admin/finance/dashboard?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Get Profit & Loss Statement
```bash
# Full P&L statement
curl -X GET "http://localhost:5001/api/super-admin/finance/profit-loss?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Quick summary
curl -X GET "http://localhost:5001/api/super-admin/finance/profit-loss/summary?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Get Financial Statements (Ledger)
```bash
curl -X GET "http://localhost:5001/api/super-admin/finance/statements?from=2026-01-01&to=2026-01-31&page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### List Expenses
```bash
# All expenses
curl -X GET "http://localhost:5001/api/super-admin/finance/expenses" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Filter by status
curl -X GET "http://localhost:5001/api/super-admin/finance/expenses?status=APPROVED" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Create Expense
```bash
curl -X POST "http://localhost:5001/api/super-admin/finance/expenses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Office Supplies",
    "description": "Printer paper and pens",
    "amount": 5000,
    "date": "2026-01-19T00:00:00Z",
    "vendor": "Office Depot",
    "categoryId": "category-uuid"
  }' | jq '.'
```

### List Income
```bash
# All income
curl -X GET "http://localhost:5001/api/super-admin/finance/income" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# With date range
curl -X GET "http://localhost:5001/api/super-admin/finance/income?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Get Income Summary
```bash
curl -X GET "http://localhost:5001/api/super-admin/finance/income/summary?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### List Purchases
```bash
# All purchases
curl -X GET "http://localhost:5001/api/super-admin/finance/purchases" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Filter by payment status
curl -X GET "http://localhost:5001/api/super-admin/finance/purchases?paymentStatus=UNPAID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Get Payables
```bash
# List all payables
curl -X GET "http://localhost:5001/api/super-admin/finance/payables" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Get payables summary
curl -X GET "http://localhost:5001/api/super-admin/finance/payables/summary" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Financial Summary Response
```json
{
  "success": true,
  "data": {
    "range": {
      "from": "2026-01-01T00:00:00.000Z",
      "to": "2026-01-31T23:59:59.999Z"
    },
    "profitLoss": {
      "revenueCents": 500000,
      "expenseCents": 250000,
      "profitCents": 250000
    },
    "ledger": {
      "totalEntries": 150,
      "latestEntries": [
        {
          "id": "uuid",
          "date": "2026-01-15T10:00:00.000Z",
          "type": "INCOME",
          "description": "Booking payment",
          "amountCents": 100000,
          "direction": "in",
          "reference": "booking-uuid"
        },
        {
          "id": "uuid",
          "date": "2026-01-14T14:00:00.000Z",
          "type": "EXPENSE",
          "description": "Office supplies",
          "amountCents": 5000,
          "direction": "out",
          "reference": "expense-uuid"
        }
      ]
    },
    "payables": {
      "openCount": 5,
      "openAmountCents": 75000
    },
    "receivables": {
      "count": 0,
      "amountCents": 0
    },
    "systemNotes": []
  }
}
```

### Ping Response
```json
{
  "success": true,
  "message": "Finance module is operational",
  "database": "connected",
  "timestamp": "2026-01-19T14:30:00.000Z"
}
```

### Record Payment
```bash
curl -X POST "http://localhost:5001/api/super-admin/finance/payables/PURCHASE_UUID/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCents": 50000,
    "paidAt": "2026-01-19T14:30:00Z",
    "paymentMethod": "TRANSFER",
    "note": "Payment via wire transfer"
  }' | jq '.'
```

### Get Categories
```bash
curl -X GET "http://localhost:5001/api/super-admin/finance/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 📊 Sample Responses

### Dashboard Response
```json
{
  "success": true,
  "data": {
    "range": {
      "from": "2026-01-01T00:00:00.000Z",
      "to": "2026-01-31T23:59:59.999Z"
    },
    "kpis": {
      "totalIncomeCents": 500000,
      "totalExpensesCents": 250000,
      "netProfitCents": 250000,
      "pendingPayablesCents": 75000,
      "overduePayablesCents": 10000,
      "netCashFlowCents": 425000
    },
    "recentTransactions": [
      {
        "id": "uuid",
        "date": "2026-01-15T10:00:00.000Z",
        "type": "INCOME",
        "description": "Booking payment",
        "amountCents": 100000,
        "currency": "USD",
        "direction": "in"
      }
    ]
  }
}
```

### Profit & Loss Response
```json
{
  "success": true,
  "data": {
    "range": {
      "from": "2026-01-01T00:00:00.000Z",
      "to": "2026-01-31T23:59:59.999Z"
    },
    "income": {
      "booking": 450000,
      "manual": 50000,
      "total": 500000
    },
    "expenses": {
      "byCategory": [
        {
          "category": "Utilities",
          "amount": 50000
        },
        {
          "category": "Supplies",
          "amount": 25000
        }
      ],
      "total": 250000
    },
    "totalIncomeCents": 500000,
    "totalExpensesCents": 250000,
    "netProfitCents": 250000
  }
}
```

---

## 🏗️ Architecture

### Route Mounting Strategy
```
/api/super-admin/finance/
├── /dashboard          → mounts finance/dashboard routes
├── /profit-loss        → mounts finance/profitLoss routes
├── /statements         → mounts finance/statements routes
├── /expenses           → mounts finance/expenses routes
├── /income             → mounts finance/income routes
├── /purchases          → mounts finance/purchases routes
├── /payables           → mounts finance/payables routes
└── /categories         → calls finance/categories controller
```

### Code Flow
```
Super Admin Finance Router
    ↓ (imports & mounts)
Finance Module Routes
    ↓ (calls)
Finance Controllers
    ↓ (calls)
Finance Services
    ↓ (uses)
Prisma ORM
```

**Result:** Zero code duplication, all business logic centralized!

---

## ✅ Benefits

### For Developers
✅ **Zero Duplication** - All logic in one place  
✅ **Single Source of Truth** - One codebase to maintain  
✅ **Bug Fixes Propagate** - Fix once, works everywhere  
✅ **Consistent Behavior** - Same calculations across all roles  

### For Business
✅ **Data Consistency** - Same numbers for admin and super admin  
✅ **Audit Trail** - All changes tracked in one place  
✅ **Unified Reporting** - Same reports, same logic  

### For Testing
✅ **Test Once** - Same tests work for both endpoints  
✅ **No Divergence** - Logic can't drift apart  

---

## 🔐 Security

- ✅ All endpoints require authentication (JWT token)
- ✅ All endpoints require SUPER_ADMIN role
- ✅ Existing middleware handles authorization
- ✅ Same security rules as /api/finance

---

## 📝 Migration Notes

### For Frontend Teams

**Old Pattern (Admin):**
```javascript
GET /api/finance/dashboard
GET /api/finance/expenses
GET /api/finance/income
```

**New Pattern (Super Admin):**
```javascript
GET /api/super-admin/finance/dashboard
GET /api/super-admin/finance/expenses
GET /api/super-admin/finance/income
```

**Same Response Format** - No changes to data structures!

---

## 🚀 Quick Start

```bash
# 1. Login as Super Admin
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"Password123!"}' \
  | jq -r '.token')

# 2. Access any finance endpoint
curl -X GET "http://localhost:5001/api/super-admin/finance/dashboard" \
  -H "Authorization: Bearer $TOKEN"

# 3. Use same parameters as /api/finance endpoints
curl -X GET "http://localhost:5001/api/super-admin/finance/profit-loss?from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 Related Documentation

For detailed parameter documentation, see the existing finance API docs:
- Expenses API: [EXPENSE_API_TESTING.md](../../EXPENSE_API_TESTING.md)
- Income API: [INCOME_API_TESTING.md](../../INCOME_API_TESTING.md)
- Purchase API: Various purchase docs
- Payables API: [STATEMENTS_API.md](../../STATEMENTS_API.md)
- Profit & Loss: [PROFIT_LOSS_QUICK_START.md](../../PROFIT_LOSS_QUICK_START.md)

All parameters, request/response formats, and behaviors are **identical** for super-admin endpoints.

---

## ⚠️ Important Notes

1. **No Logic Duplication** - Don't create new services for super-admin finance
2. **Reuse Everything** - Controllers, services, validations all shared
3. **Same Database** - All roles use same tables (Expense, Income, Purchase, etc.)
4. **Consistent Results** - Same query = same results for admin and super-admin
5. **Middleware Compatibility** - Existing `requireAdmin` allows SUPER_ADMIN

---

**Implementation Complete!** ✨

All finance endpoints are now available under `/api/super-admin/finance/*` with zero code duplication.
