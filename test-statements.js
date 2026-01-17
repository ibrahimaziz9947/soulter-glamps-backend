/**
 * Test script for Financial Statements API
 * Tests the new GET /api/finance/statements endpoint
 * 
 * Run: node test-statements.js
 */

const BASE_URL = 'http://localhost:5001';

// You'll need to update this token with a valid ADMIN/SUPER_ADMIN token
const AUTH_TOKEN = 'your-admin-token-here';

async function testStatements() {
  console.log('🧪 Testing Financial Statements API\n');

  try {
    // Test 1: Basic request with default parameters
    console.log('Test 1: Basic request with defaults');
    const response1 = await fetch(`${BASE_URL}/api/finance/statements`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    });
    
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', JSON.stringify(data1, null, 2));
    console.log('\n---\n');

    // Test 2: With date range filter
    console.log('Test 2: With date range (Jan 2026)');
    const response2 = await fetch(
      `${BASE_URL}/api/finance/statements?from=2026-01-01&to=2026-01-31`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );
    
    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Items returned:', data2.data?.items?.length || 0);
    console.log('Total items:', data2.data?.pagination?.totalItems || 0);
    console.log('Debug counts:', data2.data?.debug?.counts);
    console.log('\n---\n');

    // Test 3: With search filter
    console.log('Test 3: With search filter');
    const response3 = await fetch(
      `${BASE_URL}/api/finance/statements?search=booking&pageSize=10`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );
    
    const data3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Items returned:', data3.data?.items?.length || 0);
    console.log('Sample item:', data3.data?.items?.[0] || 'No items');
    console.log('\n---\n');

    // Test 4: Test expense mode filtering
    console.log('Test 4: Include submitted expenses');
    const response4 = await fetch(
      `${BASE_URL}/api/finance/statements?expenseMode=includeSubmitted`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );
    
    const data4 = await response4.json();
    console.log('Status:', response4.status);
    console.log('Total items:', data4.data?.pagination?.totalItems || 0);
    console.log('Expense count:', data4.data?.debug?.counts?.expenses || 0);
    console.log('\n---\n');

    // Test 5: Test sort direction
    console.log('Test 5: Ascending sort by date');
    const response5 = await fetch(
      `${BASE_URL}/api/finance/statements?sort=asc&pageSize=5`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );
    
    const data5 = await response5.json();
    console.log('Status:', response5.status);
    if (data5.data?.items?.length > 0) {
      console.log('First item date:', data5.data.items[0].date);
      console.log('Last item date:', data5.data.items[data5.data.items.length - 1].date);
    }
    console.log('\n---\n');

    // Test 6: Test empty string handling
    console.log('Test 6: Empty string parameters');
    const response6 = await fetch(
      `${BASE_URL}/api/finance/statements?from=&to=&currency=&search=`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );
    
    const data6 = await response6.json();
    console.log('Status:', response6.status);
    console.log('Should work without errors:', data6.success);
    console.log('Debug filters:', data6.data?.debug?.filters);
    console.log('\n---\n');

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run tests
testStatements();
