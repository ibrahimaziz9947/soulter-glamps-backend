#!/bin/bash
# Route Diagnostic Script for Expense Workflow Endpoints

echo "🔍 ROUTE DIAGNOSTIC SCRIPT"
echo "=========================="
echo ""

# Test 1: Verify file imports
echo "1️⃣ Testing expense.routes.js imports..."
node -e "
import('./src/modules/finance/expenses/expense.routes.js')
  .then(m => console.log('   ✅ expense.routes.js imports successfully'))
  .catch(e => console.log('   ❌ Import error:', e.message))
"

# Test 2: Verify controller exports
echo ""
echo "2️⃣ Testing controller exports..."
node -e "
import('./src/modules/finance/expenses/expense.controller.js')
  .then(m => {
    const required = ['submitExpense', 'approveExpense', 'rejectExpense', 'cancelExpense'];
    const missing = required.filter(fn => !m[fn]);
    if (missing.length === 0) {
      console.log('   ✅ All workflow methods exported:');
      required.forEach(fn => console.log('      ✓', fn));
    } else {
      console.log('   ❌ Missing:', missing.join(', '));
    }
  })
  .catch(e => console.log('   ❌ Import error:', e.message))
"

# Test 3: Check middleware availability
echo ""
echo "3️⃣ Testing middleware availability..."
node -e "
import('./src/middleware/auth.js')
  .then(() => import('./src/middleware/roles.js'))
  .then(() => console.log('   ✅ Middleware imports successfully'))
  .catch(e => console.log('   ❌ Middleware error:', e.message))
"

# Test 4: Verify finance.routes.js mounting
echo ""
echo "4️⃣ Testing finance routes mounting..."
node -e "
import('./src/routes/finance.routes.js')
  .then(() => console.log('   ✅ finance.routes.js mounts successfully'))
  .catch(e => console.log('   ❌ Mount error:', e.message))
"

echo ""
echo "✅ All diagnostics complete!"
echo ""
echo "📝 Expected API URLs:"
echo "   POST /api/finance/expenses/:id/submit"
echo "   POST /api/finance/expenses/:id/approve"
echo "   POST /api/finance/expenses/:id/reject"
echo "   POST /api/finance/expenses/:id/cancel"
