/**
 * Test: Admin Booking Creation with Duplicate Email
 * 
 * This test reproduces the bug where:
 * 1. Admin creates booking with email that already exists
 * 2. API returns success toast
 * 3. But booking does NOT appear in:
 *    - /admin/bookings
 *    - /super-admin/bookings
 *    - database
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001';

/**
 * Login as SUPER_ADMIN
 */
async function loginAsSuperAdmin() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'super@soulter.com',
      password: 'super123',
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error('Login failed: ' + data.error);
  }

  return data.token;
}

/**
 * Get all glamps to use in booking
 */
async function getGlamps(token) {
  const response = await fetch(`${BASE_URL}/api/glamps`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!data.success || !data.data || data.data.length === 0) {
    throw new Error('No glamps available');
  }

  return data.data[0]; // Return first glamp
}

/**
 * Create booking with specific email
 */
async function createBooking(token, glampId, email, name, isFirstAttempt = true) {
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + (isFirstAttempt ? 10 : 20)); // Different dates for each attempt
  
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 2);

  const payload = {
    glampId: glampId,
    checkInDate: checkInDate.toISOString(),
    checkOutDate: checkOutDate.toISOString(),
    adults: 2,
    children: 0,
    guest: {
      fullName: name,
      email: email,
      phone: '+1234567890',
    },
    paymentStatus: 'PENDING',
  };

  console.log(`\n${isFirstAttempt ? '1️⃣' : '2️⃣'}  Creating booking with email: ${email}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(`${BASE_URL}/api/admin/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`Response status: ${response.status}`);
  console.log(`Response text:`, responseText);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse response as JSON');
    return { success: false, error: 'Invalid JSON response' };
  }

  if (data.success) {
    console.log(`✅ API returned success (booking ID: ${data.data?.id || 'unknown'})`);
  } else {
    console.log(`❌ API returned error: ${data.error}`);
  }

  return data;
}

/**
 * Get all admin bookings
 */
async function getAdminBookings(token) {
  const response = await fetch(`${BASE_URL}/api/admin/bookings`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data.data || [];
}

/**
 * Get all super-admin bookings
 */
async function getSuperAdminBookings(token) {
  const response = await fetch(`${BASE_URL}/api/super-admin/bookings`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data.data?.items || [];
}

/**
 * Main test
 */
async function runTest() {
  try {
    console.log('===========================================');
    console.log('TEST: Admin Booking with Duplicate Email');
    console.log('===========================================\n');

    // Step 1: Login
    console.log('🔐 Logging in as SUPER_ADMIN...');
    const token = await loginAsSuperAdmin();
    console.log('✅ Logged in successfully\n');

    // Step 2: Get a glamp
    console.log('🏕️  Getting available glamp...');
    const glamp = await getGlamps(token);
    console.log(`✅ Using glamp: ${glamp.name} (${glamp.id})\n`);

    // Use a test email that might already exist or will be created
    const testEmail = 'test-duplicate@example.com';
    
    // Step 3: Create first booking with this email
    console.log('📝 ATTEMPT 1: Creating first booking...');
    const booking1 = await createBooking(token, glamp.id, testEmail, 'John Doe', true);
    
    if (!booking1.success) {
      console.log('⚠️  First booking failed - this is expected if email already exists');
    } else {
      console.log(`✅ First booking created with ID: ${booking1.data?.id}`);
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Create second booking with SAME email but different name
    console.log('\n📝 ATTEMPT 2: Creating second booking with SAME email (different name)...');
    const booking2 = await createBooking(token, glamp.id, testEmail, 'Jane Smith', false);
    
    console.log('\n===========================================');
    console.log('RESULTS:');
    console.log('===========================================');
    
    if (booking2.success) {
      console.log('✅ API returned SUCCESS for second booking');
      console.log(`   Booking ID: ${booking2.data?.id || 'NONE'}`);
      
      // Wait for DB to settle
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 5: Check if booking appears in listings
      console.log('\n🔍 Checking if booking appears in /admin/bookings...');
      const adminBookings = await getAdminBookings(token);
      const foundInAdmin = adminBookings.some(b => b.id === booking2.data?.id);
      console.log(`   ${foundInAdmin ? '✅ FOUND' : '❌ NOT FOUND'} (${adminBookings.length} total bookings)`);
      
      console.log('\n🔍 Checking if booking appears in /super-admin/bookings...');
      const superAdminBookings = await getSuperAdminBookings(token);
      const foundInSuperAdmin = superAdminBookings.some(b => b.id === booking2.data?.id);
      console.log(`   ${foundInSuperAdmin ? '✅ FOUND' : '❌ NOT FOUND'} (${superAdminBookings.length} total bookings)`);
      
      if (!foundInAdmin || !foundInSuperAdmin) {
        console.log('\n❌ BUG CONFIRMED: API returned success but booking is NOT in listings!');
      } else {
        console.log('\n✅ Booking appears in both listings - working correctly');
      }
    } else {
      console.log('❌ API correctly returned ERROR for duplicate email');
      console.log(`   Error message: ${booking2.error}`);
      console.log('\n✅ This is the CORRECT behavior (no false success)');
    }

    console.log('\n===========================================\n');

  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error(error.stack);
  }
}

runTest();
