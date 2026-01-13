# Purchase API 500 Error Fix

## Problem
Frontend was sending purchase creation requests that resulted in 500 errors due to:
1. Extra fields like `category` being passed to Prisma
2. Date format `"2026-01-13"` (YYYY-MM-DD) not being properly normalized
3. Poor error handling masking the root cause

## Solutions Implemented

### 1. Field Whitelisting (Controller)
**Location:** `purchase.controller.js` - `createPurchase()` and `updatePurchase()`

**Before:**
```javascript
const purchase = await purchaseService.createPurchase(req.body, actor);
```

**After:**
```javascript
// Whitelist allowed fields only (ignore extra fields like 'category')
const { amount, currency, purchaseDate, vendorName, status, reference, notes } = req.body;

// Build whitelisted payload
const whitelistedPayload = {
  amount,
  currency,
  purchaseDate: normalizedDate,
  vendorName,
  status,
  reference,
  notes,
};

const purchase = await purchaseService.createPurchase(whitelistedPayload, actor);
```

**Result:** Extra fields like `category` are now safely ignored instead of causing Prisma errors.

### 2. Date Format Normalization (Controller)
**Location:** `purchase.controller.js` - `createPurchase()` and `updatePurchase()`

**Added:**
```javascript
// Normalize purchaseDate - handle both "YYYY-MM-DD" and full ISO strings
let normalizedDate;
try {
  // If it's just a date string (YYYY-MM-DD), append time to make it a proper DateTime
  if (typeof purchaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
    normalizedDate = new Date(`${purchaseDate}T00:00:00.000Z`);
  } else {
    normalizedDate = new Date(purchaseDate);
  }

  if (isNaN(normalizedDate.getTime())) {
    throw new Error('Invalid date');
  }
} catch (err) {
  return res.status(400).json({
    success: false,
    error: 'Purchase date must be a valid date (YYYY-MM-DD or ISO format)',
  });
}
```

**Result:** Both `"2026-01-13"` and full ISO strings are now properly handled.

### 3. Enhanced Error Handling (Service)
**Location:** `purchase.service.js` - `createPurchase()` and `updatePurchase()`

**Added:**
```javascript
export const createPurchase = async (payload, actor) => {
  try {
    // ... validation and creation logic ...
    
    const purchase = await prisma.purchase.create({
      // ... data ...
    });
    
    return purchase;
  } catch (error) {
    // Log detailed error for debugging
    console.error('❌ Purchase creation error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      throw new ValidationError('A purchase with this reference already exists');
    }

    if (error.code === 'P2003') {
      throw new ValidationError('Invalid user reference');
    }

    // Re-throw ValidationError/NotFoundError
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }

    // Generic error with helpful message
    throw new ValidationError('Failed to create purchase: ' + error.message);
  }
};
```

**Result:** 
- Errors are logged server-side with full details for debugging
- Returns 400 with helpful messages instead of 500
- Maintains proper response format: `{ success: false, error: "..." }`

### 4. Date Object Validation (Service)
**Location:** `purchase.service.js` - `createPurchase()` and `updatePurchase()`

**Added:**
```javascript
// Ensure purchaseDate is a Date object
let purchaseDate;
if (payload.purchaseDate instanceof Date) {
  purchaseDate = payload.purchaseDate;
} else {
  purchaseDate = new Date(payload.purchaseDate);
  if (isNaN(purchaseDate.getTime())) {
    throw new ValidationError('Invalid purchase date format');
  }
}
```

**Result:** Guarantees Prisma receives a proper Date object.

## Testing

### Quick Test
Run the frontend payload test:
```bash
node test-purchase-frontend-payload.js
```

This tests:
- ✅ Extra `category` field is ignored
- ✅ `"2026-01-13"` date format works
- ✅ ISO date format still works
- ✅ Returns 201 (not 500)

### Full Integration Tests
Run comprehensive test suite:
```bash
node test-purchase-apis.js
```

### Manual curl Test
```bash
# Login
curl -X POST http://localhost:5001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@soulter.com","password":"admin123"}'

# Create purchase with frontend-style payload
curl -X POST http://localhost:5001/api/finance/purchases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorName": "Acme Corp",
    "purchaseDate": "2026-01-13",
    "amount": 50000,
    "currency": "USD",
    "status": "DRAFT",
    "category": "office-supplies",
    "reference": "PO-001",
    "notes": "Test purchase"
  }'
```

Expected response: **201 Created** with purchase data

## Files Modified

1. `src/modules/finance/purchases/purchase.controller.js`
   - Added field whitelisting in `createPurchase()` and `updatePurchase()`
   - Added date normalization logic
   - Added sample curl in comments

2. `src/modules/finance/purchases/purchase.service.js`
   - Wrapped create/update in try-catch blocks
   - Added detailed error logging
   - Added Prisma error code handling
   - Added date object validation

## Files Created

1. `test-purchase-frontend-payload.js` - Quick sanity check for frontend payload handling

## Result

✅ POST /api/finance/purchases now returns **201** (success) instead of **500** (error)  
✅ Extra fields are safely ignored  
✅ Date formats are properly normalized  
✅ Helpful error messages for debugging  
✅ Maintains consistent response format
