import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * TEMPORARY: Reset all finance data
 * @route DELETE /api/admin/temp-reset-finance
 * @access ADMIN, SUPER_ADMIN
 */
export const resetFinanceData = asyncHandler(async (req, res) => {
  // Use a transaction to ensure atomic deletion
  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete dependent tables first (to avoid foreign key constraints)
    
    // Expense Approval Events depend on Expenses
    const deletedApprovalEvents = await tx.expenseApprovalEvent.deleteMany();
    
    // 2. Delete main finance tables
    
    // Expenses (may depend on ExpenseCategory, but we'll keep categories for now as they are lookup data)
    // If ExpenseCategory is considered "transactional finance data", uncomment the delete for it below
    const deletedExpenses = await tx.expense.deleteMany();
    
    // Incomes (may link to Bookings, but Bookings are not being deleted here)
    const deletedIncomes = await tx.income.deleteMany();
    
    // Purchases (Payables)
    const deletedPurchases = await tx.purchase.deleteMany();
    
    // Commissions (Finance related)
    const deletedCommissions = await tx.commission.deleteMany();

    // 3. Return deletion stats
    return {
      expenseApprovalEvents: deletedApprovalEvents.count,
      expenses: deletedExpenses.count,
      incomes: deletedIncomes.count,
      purchases: deletedPurchases.count,
      commissions: deletedCommissions.count,
    };
  });

  return res.status(200).json({
    success: true,
    message: 'Finance data reset successfully',
    deletedCounts: result,
  });
});
