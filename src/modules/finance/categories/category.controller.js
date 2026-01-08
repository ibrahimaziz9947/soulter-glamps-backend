import prisma from '../../../config/prisma.js';
import { asyncHandler } from '../../../utils/errors.js';

/**
 * Get all expense categories
 * @route GET /api/finance/categories
 * @access ADMIN, SUPER_ADMIN
 */
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.expenseCategory.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  return res.status(200).json({
    success: true,
    data: categories,
  });
});
