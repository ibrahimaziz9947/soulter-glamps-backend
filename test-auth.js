/**
 * Test Authentication for All Three Roles
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001/api/auth';

async function testLogin(role, email, password) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing ${role} Login`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Email: ${email}`);
  
  try {
    const response = await fetch(`${BASE_URL}/${role.toLowerCase()}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    
    // Check for auth_token cookie
    const cookies = response.headers.get('set-cookie');
    if (cookies && cookies.includes('auth_token')) {
      console.log('✅ Cookie set: auth_token');
    } else {
      console.log('❌ No auth_token cookie found');
    }
    
    // Validate response format
    if (data.success && data.user && !data.token) {
      console.log('✅ Response format correct (no token in body)');
    } else if (data.token) {
      console.log('❌ Token should NOT be in response body');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n🧪 Starting Authentication Tests\n');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test all three roles
  await testLogin('admin', 'admin@soulter.com', 'admin123');
  await testLogin('agent', 'agent@soulter.com', 'agent123');
  await testLogin('super-admin', 'superadmin@soulter.com', 'super123');
  
  // Test with wrong credentials
  console.log(`\n${'='.repeat(50)}`);
  console.log('Testing Wrong Credentials');
  console.log(`${'='.repeat(50)}`);
  await testLogin('admin', 'admin@soulter.com', 'wrongpassword');
  
  // Test with wrong role
  console.log(`\n${'='.repeat(50)}`);
  console.log('Testing Role Mismatch (ADMIN trying AGENT login)');
  console.log(`${'='.repeat(50)}`);
  await testLogin('agent', 'admin@soulter.com', 'admin123');
  
  console.log('\n\n✅ All tests completed!\n');
}

runAllTests().catch(console.error);
