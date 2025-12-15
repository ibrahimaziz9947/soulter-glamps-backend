// Test script for role-specific login endpoints
// Run with: node test-login.js

const BASE_URL = 'http://localhost:5001/api/auth';

// Test data
const credentials = {
  admin: { email: 'admin@soulter.com', password: 'admin123' },
  agent: { email: 'agent@soulter.com', password: 'agent123' },
  superAdmin: { email: 'super@soulter.com', password: 'super123' }
};

async function testLogin(endpoint, credentials, shouldSucceed, testName) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    const success = response.ok;

    if (success === shouldSucceed) {
      console.log(`✅ ${testName}: PASS`);
      if (success) {
        console.log(`   Logged in as: ${data.user.email} (${data.user.role})`);
      } else {
        console.log(`   Correctly rejected: ${data.message || data.error}`);
      }
    } else {
      console.log(`❌ ${testName}: FAIL`);
      console.log(`   Expected success: ${shouldSucceed}, Got: ${success}`);
      console.log(`   Response:`, data);
    }
    console.log('');
  } catch (error) {
    console.log(`❌ ${testName}: ERROR`);
    console.log(`   ${error.message}`);
    console.log('');
  }
}

async function runTests() {
  console.log('========================================');
  console.log('🧪 Testing Role-Specific Login Endpoints');
  console.log('========================================\n');

  // Test 1: Admin credentials on admin login (should succeed)
  await testLogin('/admin/login', credentials.admin, true, 
    'Test 1: Admin login with admin credentials');

  // Test 2: Agent credentials on admin login (should fail)
  await testLogin('/admin/login', credentials.agent, false, 
    'Test 2: Admin login with agent credentials');

  // Test 3: Super admin credentials on admin login (should fail)
  await testLogin('/admin/login', credentials.superAdmin, false, 
    'Test 3: Admin login with super-admin credentials');

  // Test 4: Agent credentials on agent login (should succeed)
  await testLogin('/agent/login', credentials.agent, true, 
    'Test 4: Agent login with agent credentials');

  // Test 5: Admin credentials on agent login (should fail)
  await testLogin('/agent/login', credentials.admin, false, 
    'Test 5: Agent login with admin credentials');

  // Test 6: Super admin credentials on super-admin login (should succeed)
  await testLogin('/super-admin/login', credentials.superAdmin, true, 
    'Test 6: Super-admin login with super-admin credentials');

  // Test 7: Admin credentials on super-admin login (should fail)
  await testLogin('/super-admin/login', credentials.admin, false, 
    'Test 7: Super-admin login with admin credentials');

  console.log('========================================');
  console.log('✅ All tests completed');
  console.log('========================================');
}

runTests();
