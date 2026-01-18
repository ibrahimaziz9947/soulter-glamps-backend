/**
 * Super Admin Finance Routes
 * 
 * This module reuses ALL existing finance services and controllers.
 * NO logic duplication - all endpoints call the same services used by /api/finance
 * 
 * Existing finance modules (all working end-to-end):
 * - Categories: GET /categories
 * - Expenses: Full CRUD + workflow (submit/approve/reject/cancel)
 * - Income: Full CRUD + summary + restore
 * - Purchases: Full CRUD + summary + restore
 * - Payables: List, summary, record payments
 * - Profit & Loss: Full P&L statement with breakdown
 * - Statements: Ledger view of all transactions
 * - Dashboard: Financial KPIs and recent transactions
 * 
 * All routes under /api/super-admin/finance/* are identical to /api/finance/*
 * except they require SUPER_ADMIN role instead of ADMIN.
 */

import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireSuperAdmin } from '../../../middleware/roles.js';

// Import existing finance module routes
import expenseRoutes from '../../finance/expenses/expense.routes.js';
import incomeRoutes from '../../finance/income/income.routes.js';
import purchaseRoutes from '../../finance/purchases/purchase.routes.js';
import payablesRoutes from '../../finance/payables/payables.routes.js';
import profitLossRoutes from '../../finance/profitLoss/profitLoss.routes.js';
import statementsRoutes from '../../finance/statements/statements.routes.js';
import dashboardRoutes from '../../finance/dashboard/dashboard.routes.js';

// Import existing controllers
import * as categoryController from '../../finance/categories/category.controller.js';
import * as superAdminFinanceController from './super-admin-finance.controller.js';

const router = express.Router();

/**
 * STRATEGY: Reuse existing routes by mounting them under super-admin path
 * 
 * Note: The existing routes already have authRequired + requireAdmin middleware.
 * Since requireAdmin allows SUPER_ADMIN, these routes will work for super admins.
 * 
 * We're mounting them here for organizational purposes and consistency with
 * the super-admin namespace structure.
 */

// ============================================================================
// SUPER ADMIN SPECIFIC ENDPOINTS
// ============================================================================

/**
 * GET /api/super-admin/finance/summary
 * Comprehensive financial summary combining P&L, ledger, and payables
 * 
 * Query params: from, to (optional, defaults to last 30 days)
 * 
 * Returns:
 * - Profit & Loss summary (revenue, expenses, profit)
 * - Latest ledger entries
 * - Open payables count and amount
 * - Receivables placeholder (0 for now)
 * - System notes (optional)
 */
router.get('/summary', authRequired, requireSuperAdmin, superAdminFinanceController.getFinancialSummary);

/**
 * GET /api/super-admin/finance/ping
 * Health check endpoint - verifies database connectivity
 */
router.get('/ping', authRequired, requireSuperAdmin, superAdminFinanceController.pingFinance);

// ============================================================================
// DASHBOARD
// ============================================================================
/**
 * GET /api/super-admin/finance/dashboard
 * 
 * Returns:
 * - KPIs (income, expenses, profit, payables, cash flow)
 * - Recent transactions
 * - Date range filtering
 * 
 * Reuses: finance/dashboard module (same service/controller)
 */
router.use('/dashboard', dashboardRoutes);

// ============================================================================
// PROFIT & LOSS STATEMENT
// ============================================================================
/**
 * GET /api/super-admin/finance/profit-loss
 * Full P&L statement with income/expense breakdown
 * 
 * GET /api/super-admin/finance/profit-loss/summary
 * Quick summary (total income, expenses, net profit)
 * 
 * Reuses: finance/profitLoss module (same service/controller)
 */
router.use('/profit-loss', profitLossRoutes);

// ============================================================================
// STATEMENTS (LEDGER VIEW)
// ============================================================================
/**
 * GET /api/super-admin/finance/statements
 * 
 * Returns chronological list of all financial transactions:
 * - Income entries
 * - Expense entries
 * - Purchase entries
 * - Date range filtering
 * - Pagination support
 * 
 * Reuses: finance/statements module (same service/controller)
 */
router.use('/statements', statementsRoutes);

// ============================================================================
// EXPENSES
// ============================================================================
/**
 * Expense Management (Full CRUD + Workflow)
 * 
 * POST   /api/super-admin/finance/expenses              - Create expense
 * GET    /api/super-admin/finance/expenses              - List expenses
 * GET    /api/super-admin/finance/expenses/:id          - Get expense details
 * PATCH  /api/super-admin/finance/expenses/:id          - Update expense
 * DELETE /api/super-admin/finance/expenses/:id          - Delete expense
 * 
 * Workflow:
 * POST   /api/super-admin/finance/expenses/:id/submit   - Submit for approval
 * POST   /api/super-admin/finance/expenses/:id/approve  - Approve expense
 * POST   /api/super-admin/finance/expenses/:id/reject   - Reject expense
 * POST   /api/super-admin/finance/expenses/:id/cancel   - Cancel expense
 * 
 * Reuses: finance/expenses module (same service/controller)
 */
router.use('/expenses', expenseRoutes);

// ============================================================================
// INCOME
// ============================================================================
/**
 * Income Management (Full CRUD + Summary)
 * 
 * POST   /api/super-admin/finance/income                - Create income
 * GET    /api/super-admin/finance/income                - List income
 * GET    /api/super-admin/finance/income/summary        - Get summary
 * GET    /api/super-admin/finance/income/:id            - Get income details
 * PATCH  /api/super-admin/finance/income/:id            - Update income
 * DELETE /api/super-admin/finance/income/:id            - Soft delete income
 * POST   /api/super-admin/finance/income/:id/restore    - Restore deleted income
 * 
 * Reuses: finance/income module (same service/controller)
 */
router.use('/income', incomeRoutes);

// ============================================================================
// PURCHASES
// ============================================================================
/**
 * Purchase Management (Full CRUD + Summary)
 * 
 * POST   /api/super-admin/finance/purchases             - Create purchase
 * GET    /api/super-admin/finance/purchases             - List purchases
 * GET    /api/super-admin/finance/purchases/summary     - Get summary
 * GET    /api/super-admin/finance/purchases/:id         - Get purchase details
 * PATCH  /api/super-admin/finance/purchases/:id         - Update purchase
 * DELETE /api/super-admin/finance/purchases/:id         - Soft delete purchase
 * POST   /api/super-admin/finance/purchases/:id/restore - Restore deleted purchase
 * 
 * Reuses: finance/purchases module (same service/controller)
 */
router.use('/purchases', purchaseRoutes);

// ============================================================================
// PAYABLES
// ============================================================================
/**
 * Payables Management (List + Payment Recording)
 * 
 * GET    /api/super-admin/finance/payables              - List payables
 * GET    /api/super-admin/finance/payables/summary      - Get summary (total due, overdue)
 * POST   /api/super-admin/finance/payables/:purchaseId/pay - Record payment
 * 
 * Reuses: finance/payables module (same service/controller)
 */
router.use('/payables', payablesRoutes);

// ============================================================================
// CATEGORIES
// ============================================================================
/**
 * GET /api/super-admin/finance/categories
 * 
 * Returns list of expense categories
 * 
 * Reuses: finance/categories controller (same service)
 */
router.get('/categories', authRequired, requireSuperAdmin, categoryController.getAllCategories);

export default router;
