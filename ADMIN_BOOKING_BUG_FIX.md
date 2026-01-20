# Admin Booking Creation Bug Fix

## Issue Summary

**Bug Report:**
- Admin creates booking via frontend
- Success toast appears
- Booking does NOT appear in:
  - `/admin/bookings`
  - `/super-admin/bookings`
  - Database

**Trigger:** Started after attempting to create a booking with a NEW name/phone but an existing email address.

## Root Cause Analysis

### Multiple Issues Identified:

1. **Race Condition in Customer Creation** ⚠️ CRITICAL
   - Original code used `findUnique` then `create`
   - Two simultaneous requests could both pass the check and both try to create
   - Second request would hit P2002 (unique constraint violation) and fail
   - This could cause the entire booking creation to fail

2. **Customer Name Mismatch** 🔧 FIXED
   - When reusing existing customer (same email), booking used the OLD name from DB
   - Should use the NEW name from the booking form (guest name)
   - Users expect to see the actual guest's name, not the email owner's profile name

3. **Error Logging Insufficient** 📝 IMPROVED
   - Added comprehensive debug logging (NODE_ENV !== 'production')
   - Logs now show:
     - Customer lookup/creation steps
     - Booking data before creation
     - Success with booking ID and timestamp
     - Errors with Prisma error code and details

## Fixes Implemented

### 1. Atomic Customer Upsert

**Before:**
```javascript
const findOrCreateCustomer = async (fullName, email, phone) => {
  let customer = await prisma.user.findUnique({ where: { email } });
  if (customer) {
    if (customer.role !== 'CUSTOMER') {
      throw new ValidationError('Email already registered with different role');
    }
    return customer;
  }
  
  // Race condition here! Another request could create between check and create
  customer = await prisma.user.create({
    data: { name: fullName, email, password: tempPassword, role: 'CUSTOMER' }
  });
  return customer;
};
```

**After:**
```javascript
// Use Prisma's atomic upsert - no race condition
const customer = await prisma.user.upsert({
  where: { email: guest.email.trim().toLowerCase() },
  update: {}, // Keep existing customer data as-is
  create: {
    name: guest.fullName.trim(),
    email: guest.email.trim().toLowerCase(),
    password: tempPassword,
    role: 'CUSTOMER',
    active: true,
  },
});

// Validate role after upsert
if (customer.role !== 'CUSTOMER') {
  throw new ValidationError('Email already registered with different role');
}
```

### 2. Use Guest Name from Form (Not DB Customer Name)

**Before:**
```javascript
booking = await prisma.booking.create({
  data: {
    customerId: customer.id,
    customerName: customer.name, // ❌ Uses DB customer name (wrong if email reused)
    ...
  }
});
```

**After:**
```javascript
booking = await prisma.booking.create({
  data: {
    customerId: customer.id,
    customerName: guest.fullName.trim(), // ✅ Uses guest name from booking form
    ...
  }
});
```

**Why this matters:**
- Customer email might be reused for different guests
- Booking should show who is actually staying, not who owns the email
- Example: Company email books@company.com used for different employees

### 3. Enhanced Debug Logging

Added debug logs at every critical step:

```javascript
if (process.env.NODE_ENV !== 'production') {
  console.log('[DEBUG] Looking up/creating customer:', { fullName, email });
  console.log('[DEBUG] Customer resolved:', { id, name, email, role });
  console.log('[DEBUG] About to create booking with data:', { ... });
  console.log('[DEBUG] ✅ Booking created successfully:', { id, createdAt, timestamp });
  console.error('[DEBUG] ❌ Error creating booking:', { code, meta, message });
}
```

This helps debug:
- Which customer was matched/created
- Exact booking data being saved
- Timestamp of creation (helps with date range filter issues)
- Prisma error codes (P2002 = unique violation, etc.)

### 4. Explicit Error Handling

Wrapped critical sections in try-catch with detailed error logging:

```javascript
try {
  customer = await prisma.user.upsert({ ... });
  // Validate role
  if (customer.role !== 'CUSTOMER') {
    throw new ValidationError('...');
  }
} catch (error) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[DEBUG] Error in customer upsert:', error);
  }
  throw error; // Re-throw to return proper error response
}
```

## Error Handling Verification

The global error handler in `src/server.js` already handles:

- **P2002 (Unique constraint)**: Returns 409 with "This record already exists"
- **P2025 (Record not found)**: Returns 404
- **P2003 (Foreign key violation)**: Returns 400
- **ValidationError**: Returns 400 with error message
- **All other errors**: Properly logged and returns 500

✅ All errors will return proper HTTP error codes (NOT success)
✅ Frontend will NOT show success toast when booking fails

## Testing Recommendations

### Test Case 1: Duplicate Email with New Name
```javascript
// Create booking #1
{
  glampId: "glamp-123",
  guest: {
    fullName: "John Doe",
    email: "test@example.com",
    phone: "+1234567890"
  }
}
// Expected: ✅ Success, customer created, booking created

// Create booking #2 (same email, different name)
{
  glampId: "glamp-123",
  guest: {
    fullName: "Jane Smith",      // ← Different name
    email: "test@example.com",   // ← Same email
    phone: "+9876543210"
  }
}
// Expected: ✅ Success, customer reused, booking created with "Jane Smith"
// Verify: Booking #2 appears in both /admin/bookings and /super-admin/bookings
// Verify: customerName = "Jane Smith" (not "John Doe")
```

### Test Case 2: Admin/Agent Email
```javascript
{
  guest: {
    fullName: "Test User",
    email: "admin@soulter.com",  // ← Admin email
  }
}
// Expected: ❌ Error 400 "Email already registered with different role"
// Verify: No success toast, error message shown
```

### Test Case 3: Rapid Duplicate Creation (Race Condition)
```javascript
// Send 2 requests simultaneously with same new email
Promise.all([
  createBooking({ guest: { email: "new@example.com", ... } }),
  createBooking({ guest: { email: "new@example.com", ... } })
]);
// Expected: ✅ Both succeed (upsert is atomic)
// OR: One succeeds, one fails with proper error (no false success)
```

## Verification Checklist

After deploying this fix, verify:

- [ ] Create booking with new email → Success, appears in lists
- [ ] Create booking with existing CUSTOMER email → Success, reuses customer
- [ ] Create booking with existing ADMIN/AGENT email → Error 400 (not success)
- [ ] Created booking appears in `/api/admin/bookings`
- [ ] Created booking appears in `/api/super-admin/bookings` (check date range filter)
- [ ] Booking in DB has correct:
  - `customerId` (linked to customer)
  - `customerName` (guest name from form, not DB customer name)
  - `createdAt` (current timestamp)
  - `status` (PENDING or CONFIRMED based on paymentStatus)
- [ ] Check server logs for debug output (development mode)
- [ ] No false success toasts when booking fails

## Files Modified

1. **`src/modules/admin/bookings/admin-booking.service.js`**
   - Replaced `findOrCreateCustomer` call with inline `upsert`
   - Added comprehensive debug logging
   - Use guest name from form (not DB customer name)
   - Enhanced error handling with try-catch blocks

2. **`src/modules/admin/bookings/admin-booking.controller.js`**
   - Added debug logging for request body
   - Added try-catch with error logging
   - Ensured errors are re-thrown to asyncHandler

## Notes

- **No database migration needed** - only code changes
- **Backward compatible** - existing bookings unaffected
- **Debug logs only in development** - won't clutter production logs
- **Error responses unchanged** - frontend error handling still works

## Potential Future Enhancements

1. **Update customer name/phone on booking creation?**
   - Currently keeps DB customer record as-is
   - Could update customer.name if it changed
   - Trade-off: Would change customer profile vs preserving history

2. **Add API endpoint to link bookings to existing customers**
   - Allow admin to manually merge duplicate customer records
   - Useful if same person used multiple emails

3. **Add customer search/autocomplete**
   - Frontend could search existing customers by email before creating booking
   - Show warning: "Email exists, will reuse customer record"

## Deployment

1. Commit changes
2. Push to repository
3. Deploy to staging first
4. Run test cases above
5. Check logs for any unexpected errors
6. Deploy to production
7. Monitor first few bookings carefully

## Support

If issue persists after this fix:
1. Check server logs for `[DEBUG]` entries (development mode)
2. Verify date/time on server (timezone issues can cause filtering problems)
3. Check if frontend is caching old state (hard refresh)
4. Use Prisma Studio to verify booking exists in DB
5. Check super-admin bookings with expanded date range (`?from=2020-01-01&to=2030-01-01`)
