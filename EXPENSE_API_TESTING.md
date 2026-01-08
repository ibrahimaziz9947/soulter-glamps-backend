# Expense API Testing Guide - Thunder Client

## What You Need to Know

### Query Parameters vs Body
- **Body**: Data you send in the request body (for POST, PATCH) - goes in the "Body" tab in Thunder Client
- **Query Parameters**: Data you add to the URL after `?` (for GET requests) - goes in the "Query" tab in Thunder Client OR directly in the URL

### Example:
- URL with query params: `http://localhost:5001/api/finance/expenses?page=1&limit=10`
- In Thunder Client: You can type the full URL above, OR use the "Query" tab and add:
  - Key: `page`, Value: `1`
  - Key: `limit`, Value: `10`

---

## Step-by-Step Testing

### STEP 0: Login and Get Token

**URL:** `http://localhost:5001/api/auth/login`
**Method:** POST
**Body (JSON):**
```json
{
  "email": "admin@soulter.com",
  "password": "admin123"
}
```

**Copy the token from response and add to all future requests:**
- In Thunder Client: Go to "Auth" tab → Select "Bearer" → Paste token

---

### STEP 1: Get Categories (to get category IDs)

**URL:** `http://localhost:5001/api/finance/categories`
**Method:** GET
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "name": "Utilities",
      "description": "Electricity, water, internet, and other utility expenses",
      "active": true,
      "createdAt": "...",
      "updatedAt": "..."
    },
    {
      "id": "uuid-here",
      "name": "Staff",
      "description": "Staff salaries, bonuses, and employee-related expenses",
      "active": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**ACTION:** Copy one of the category IDs (the uuid) for next steps

---

### STEP 2: Create Expense (Minimal)

**URL:** `http://localhost:5001/api/finance/expenses`
**Method:** POST
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE
- Content-Type: application/json

**Body (JSON):**
```json
{
  "title": "Office Rent - January 2026",
  "amount": 150000
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "id": "expense-uuid-here",
    "title": "Office Rent - January 2026",
    "amount": 150000,
    "category": null,
    "createdBy": { ... }
  }
}
```

**ACTION:** Copy the expense ID from response

---

### STEP 3: Create Expense (With Category)

**URL:** `http://localhost:5001/api/finance/expenses`
**Method:** POST
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE
- Content-Type: application/json

**Body (JSON):**
```json
{
  "title": "Office Supplies - Pens & Paper",
  "description": "Monthly office supplies purchase",
  "amount": 25000,
  "categoryId": "PASTE-CATEGORY-ID-FROM-STEP-1",
  "vendor": "Office Depot",
  "date": "2026-01-09"
}
```

---

### STEP 4: Get All Expenses (No Filters)

**URL:** `http://localhost:5001/api/finance/expenses`
**Method:** GET
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE

**In Thunder Client:**
- Just type the URL above
- No body needed
- No query params needed

---

### STEP 5: Get Expenses with Pagination

**OPTION A - Type full URL:**
`http://localhost:5001/api/finance/expenses?page=1&limit=5`

**OPTION B - Use Query tab in Thunder Client:**
- URL: `http://localhost:5001/api/finance/expenses`
- Click "Query" tab
- Add: Key=`page`, Value=`1`
- Add: Key=`limit`, Value=`5`

**Method:** GET
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE

---

### STEP 6: Get Expenses by Category

**URL:** `http://localhost:5001/api/finance/expenses?categoryId=PASTE-CATEGORY-ID-HERE`

**Method:** GET
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE

**In Thunder Client Query Tab:**
- Key: `categoryId`
- Value: (paste the category UUID from Step 1)

---

### STEP 7: Get Expenses with Date Range

**URL:** `http://localhost:5001/api/finance/expenses?fromDate=2026-01-01&toDate=2026-01-31`

**Method:** GET
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE

**In Thunder Client Query Tab:**
- Key: `fromDate`, Value: `2026-01-01`
- Key: `toDate`, Value: `2026-01-31`

---

### STEP 8: Get Expenses with Search

**URL:** `http://localhost:5001/api/finance/expenses?search=office`

**Method:** GET
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE

**In Thunder Client Query Tab:**
- Key: `search`, Value: `office`

---

### STEP 9: Get Expenses with Combined Filters

**URL:** `http://localhost:5001/api/finance/expenses?page=1&limit=10&search=office&fromDate=2026-01-01`

**Method:** GET
**In Thunder Client Query Tab:**
- Key: `page`, Value: `1`
- Key: `limit`, Value: `10`
- Key: `search`, Value: `office`
- Key: `fromDate`, Value: `2026-01-01`

---

### STEP 10: Get Single Expense by ID

**URL:** `http://localhost:5001/api/finance/expenses/PASTE-EXPENSE-ID-HERE`

**Method:** GET
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE

**Replace** `PASTE-EXPENSE-ID-HERE` with the expense ID you got from Step 2 or 3

---

### STEP 11: Update Expense

**URL:** `http://localhost:5001/api/finance/expenses/PASTE-EXPENSE-ID-HERE`

**Method:** PATCH
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE
- Content-Type: application/json

**Body (JSON):**
```json
{
  "title": "Office Rent - January 2026 (Updated)",
  "amount": 160000
}
```

---

### STEP 12: Delete Expense (Soft Delete)

**URL:** `http://localhost:5001/api/finance/expenses/PASTE-EXPENSE-ID-HERE`

**Method:** DELETE
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE

**No body needed**

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

---

### STEP 13: Verify Deleted Expense is Gone

**URL:** `http://localhost:5001/api/finance/expenses/PASTE-SAME-ID-HERE`

**Method:** GET
**Headers:**
- Authorization: Bearer YOUR_TOKEN_HERE

**Expected Response (404):**
```json
{
  "success": false,
  "message": "Expense not found"
}
```

---

## Testing Errors

### Test 1: Create Without Title

**URL:** `http://localhost:5001/api/finance/expenses`
**Method:** POST
**Body:**
```json
{
  "amount": 5000
}
```

**Expected (400):**
```json
{
  "success": false,
  "message": "Title is required"
}
```

---

### Test 2: Create With Zero Amount

**URL:** `http://localhost:5001/api/finance/expenses`
**Method:** POST
**Body:**
```json
{
  "title": "Test",
  "amount": 0
}
```

**Expected (400):**
```json
{
  "success": false,
  "message": "Amount must be a positive number"
}
```

---

### Test 3: Create With Invalid Category

**URL:** `http://localhost:5001/api/finance/expenses`
**Method:** POST
**Body:**
```json
{
  "title": "Test",
  "amount": 5000,
  "categoryId": "00000000-0000-0000-0000-000000000000"
}
```

**Expected (404):**
```json
{
  "success": false,
  "message": "Category not found"
}
```

---

## Quick Reference

### All Endpoints:

1. **Get Categories:** GET `http://localhost:5001/api/finance/categories`
2. **Create Expense:** POST `http://localhost:5001/api/finance/expenses`
3. **Get All Expenses:** GET `http://localhost:5001/api/finance/expenses`
4. **Get Expense by ID:** GET `http://localhost:5001/api/finance/expenses/:id`
5. **Update Expense:** PATCH `http://localhost:5001/api/finance/expenses/:id`
6. **Delete Expense:** DELETE `http://localhost:5001/api/finance/expenses/:id`

### Remember:
- `:id` means replace with actual UUID
- Query params go after `?` in URL OR in Query tab
- Body data goes in Body tab (for POST/PATCH)
- Always include Authorization header with Bearer token
