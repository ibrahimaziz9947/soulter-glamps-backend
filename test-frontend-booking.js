/**
 * Test Frontend Booking Payload (Day 2 - F4 Verification)
 * Tests POST /api/bookings with frontend-compatible payload
 */

console.log('═══════════════════════════════════════════════════');
console.log('🧪 FRONTEND BOOKING API VERIFICATION (F4)');
console.log('═══════════════════════════════════════════════════\n');

// Test Cases
const tests = [
  {
    name: 'Valid Booking (with "guests" field)',
    payload: {
      glampId: 'REPLACE_WITH_REAL_GLAMP_ID',
      checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      checkOutDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      guests: 2,
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah.johnson@example.com',
      customerPhone: '+1234567890',
    },
    expectedStatus: 201,
  },
  {
    name: 'Valid Booking (with "numberOfGuests" field - backward compatible)',
    payload: {
      glampId: 'REPLACE_WITH_REAL_GLAMP_ID',
      checkInDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      checkOutDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
      numberOfGuests: 3,
      customerName: 'Michael Chen',
      customerEmail: 'michael.chen@example.com',
    },
    expectedStatus: 201,
  },
  {
    name: 'Missing Customer Name',
    payload: {
      glampId: 'REPLACE_WITH_REAL_GLAMP_ID',
      checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      checkOutDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      guests: 2,
      customerEmail: 'test@example.com',
    },
    expectedStatus: 400,
    expectedError: 'Please provide your name and email address',
  },
  {
    name: 'Invalid Email Format',
    payload: {
      glampId: 'REPLACE_WITH_REAL_GLAMP_ID',
      checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      checkOutDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      guests: 2,
      customerName: 'Test User',
      customerEmail: 'invalid-email',
    },
    expectedStatus: 400,
    expectedError: 'Please provide a valid email address',
  },
  {
    name: 'Check-out Before Check-in',
    payload: {
      glampId: 'REPLACE_WITH_REAL_GLAMP_ID',
      checkInDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      checkOutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      guests: 2,
      customerName: 'Test User',
      customerEmail: 'test@example.com',
    },
    expectedStatus: 400,
    expectedError: 'Check-out date must be after check-in date',
  },
  {
    name: 'Past Check-in Date',
    payload: {
      glampId: 'REPLACE_WITH_REAL_GLAMP_ID',
      checkInDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      guests: 2,
      customerName: 'Test User',
      customerEmail: 'test@example.com',
    },
    expectedStatus: 400,
    expectedError: 'Check-in date cannot be in the past',
  },
];

console.log('📋 Test Payload Format:\n');
console.log('Expected Frontend Payload:');
console.log(JSON.stringify({
  glampId: 'uuid',
  checkInDate: 'ISO 8601 date',
  checkOutDate: 'ISO 8601 date',
  guests: 'number (or numberOfGuests)',
  customerName: 'string',
  customerEmail: 'string',
  customerPhone: 'string (optional)',
}, null, 2));

console.log('\n📝 Manual Testing Instructions:');
console.log('═══════════════════════════════════════════════════\n');

console.log('1. Get a valid glamp ID:');
console.log('   - Go to Prisma Studio (http://localhost:5555)');
console.log('   - Open "Glamp" table');
console.log('   - Copy a glamp ID (UUID format)\n');

console.log('2. Test with Thunder Client or Postman:\n');

console.log('   Test A: Valid Booking (Frontend Format)');
console.log('   POST http://localhost:5001/api/bookings');
console.log('   Content-Type: application/json\n');
console.log('   Body:');
console.log(JSON.stringify({
  glampId: 'PASTE_GLAMP_ID_HERE',
  checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  checkOutDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  guests: 2,
  customerName: 'Frontend Test User',
  customerEmail: 'frontend@test.com',
  customerPhone: '+1234567890',
}, null, 2));

console.log('\n   Expected Response (201):');
console.log(JSON.stringify({
  success: true,
  message: 'Booking created successfully! We will contact you soon.',
  booking: {
    id: 'uuid',
    status: 'PENDING',
    totalAmount: 45000,
    checkInDate: '2025-12-24T14:00:00.000Z',
    checkOutDate: '2025-12-27T11:00:00.000Z',
    glamp: { name: 'Glamp Name' },
    customer: { name: 'Frontend Test User', email: 'frontend@test.com' },
  },
}, null, 2));

console.log('\n   Test B: Missing Name (Error Handling)');
console.log('   POST http://localhost:5001/api/bookings');
console.log('   Body (missing customerName):');
console.log(JSON.stringify({
  glampId: 'PASTE_GLAMP_ID_HERE',
  checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  checkOutDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  guests: 2,
  customerEmail: 'test@example.com',
}, null, 2));

console.log('\n   Expected Response (400):');
console.log(JSON.stringify({
  success: false,
  error: 'Please provide your name and email address',
}, null, 2));

console.log('\n   Test C: Invalid Email');
console.log('   Expected Response (400):');
console.log(JSON.stringify({
  success: false,
  error: 'Please provide a valid email address',
}, null, 2));

console.log('\n3. Verify in Prisma Studio:');
console.log('   - Go to "Booking" table');
console.log('   - Find your test booking');
console.log('   - Verify status = PENDING');
console.log('   - Verify totalAmount is calculated correctly\n');

console.log('4. Check Backend Logs:');
console.log('   - Look for 📝 Creating booking:');
console.log('   - Look for ✅ Booking created successfully:\n');

console.log('\n✅ Acceptance Criteria Checklist:');
console.log('═══════════════════════════════════════════════════');
console.log('[ ] Accepts "guests" field (frontend format)');
console.log('[ ] Accepts "numberOfGuests" field (backward compatible)');
console.log('[ ] Accepts "customerPhone" (optional)');
console.log('[ ] Returns clean error messages (no stack traces)');
console.log('[ ] Creates CUSTOMER user automatically');
console.log('[ ] Calculates totalAmount from DB pricePerNight');
console.log('[ ] Returns booking with id, status, totalAmount');
console.log('[ ] Logs booking creation with glampId, email, bookingId');
console.log('[ ] No authentication required (PUBLIC endpoint)');
console.log('[ ] Booking visible in Prisma Studio\n');

console.log('📍 Server must be running: http://localhost:5001');
console.log('📍 Prisma Studio: http://localhost:5555\n');
