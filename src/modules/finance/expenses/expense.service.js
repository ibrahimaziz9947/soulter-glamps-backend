import prisma from '../../../config/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../utils/errors.js';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.js';

/**
 * Validate UUID format
 */
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Create a new expense
 * @param {object} data - Expense data
 * @param {string} userId - ID of the user creating the expense
 * @returns {Promise<object>} Created expense with category included
 */
export const createExpense = async (data, userId) => {
  // Validate required fields
  if (!data.title || data.title.trim().length === 0) {
    throw new ValidationError('Title is required');
  }

  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    throw new ValidationError('Amount must be a positive number');
  }

  // Validate categoryId if provided
  if (data.categoryId) {
    if (!isValidUUID(data.categoryId)) {
      throw new ValidationError('Invalid category ID format');
    }

    const category = await prisma.expenseCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    if (!category.active) {
      throw new ValidationError('Cannot assign inactive category');
    }
  }

  // Create expense
  const expense = await prisma.expense.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      vendor: data.vendor?.trim() || null,
      receiptUrl: data.receiptUrl?.trim() || null,
      categoryId: data.categoryId || null,
      createdById: userId,
    },
    include: {
      category: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return expense;
};

/**
 * Get expenses with filters and pagination
 * @param {object} filters - Filter options (categoryId, fromDate, toDate, search, page, limit)
 * @returns {Promise<object>} Paginated expense list with metadata and summary
 */
export const getExpenses = async (filters = {}) => {
  const { page, limit, categoryId, fromDate, toDate, search } = filters;

  // Build pagination
  const pagination = getPagination(page, limit);

  // Build where clause
  const where = {
    deletedAt: null, // Exclude soft-deleted records
  };

  // Filter by category
  if (categoryId) {
    if (!isValidUUID(categoryId)) {
      throw new ValidationError('Invalid category ID format');
    }
    where.categoryId = categoryId;
  }

  // Filter by date range
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) {
      where.date.gte = new Date(fromDate);
    }
    if (toDate) {
      where.date.lte = new Date(toDate);
    }
  }

  // Search by title, description, or vendor
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { vendor: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Execute queries in parallel
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            active: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.count({ where }),
  ]);

  // Calculate total amount
  const aggregation = await prisma.expense.aggregate({
    where,
    _sum: {
      amount: true,
    },
  });

  const totalAmount = aggregation._sum.amount || 0;

  // Build pagination metadata
  const paginationMeta = getPaginationMeta(total, pagination.page, pagination.limit);

  return {
    data: expenses,
    pagination: paginationMeta,
    summary: {
      total: totalAmount, // Raw DB value
      totalAmount, // Same value, alt field name
      totalAmountCents: totalAmount, // Legacy field name
      count: total,
    },
  };
};

/**
 * Get a single expense by ID
 * @param {string} id - Expense ID
 * @returns {Promise<object>} Expense with category and creator information
 */
export const getExpenseById = async (id) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid expense ID format');
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id,
      deletedAt: null, // Exclude soft-deleted
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          active: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      rejectedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      approvalEvents: {
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!expense) {
    throw new NotFoundError('Expense');
  }

  return expense;
};

/**
 * Update an expense
 * @param {string} id - Expense ID
 * @param {object} data - Updated expense data (partial)
 * @param {string} userId - ID of the user updating the expense
 * @returns {Promise<object>} Updated expense
 */
export const updateExpense = async (id, data, userId) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid expense ID format');
  }

  // Check if expense exists and is not deleted
  const existingExpense = await prisma.expense.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingExpense) {
    throw new NotFoundError('Expense');
  }

  // Check if expense can be edited (only DRAFT or REJECTED status)
  if (existingExpense.status !== 'DRAFT' && existingExpense.status !== 'REJECTED') {
    throw new ValidationError(`Cannot update expense with status ${existingExpense.status}. Only DRAFT or REJECTED expenses can be edited.`);
  }

  // Validate categoryId if being updated
  if (data.categoryId !== undefined) {
    if (data.categoryId === null) {
      // Allow removing category
    } else if (!isValidUUID(data.categoryId)) {
      throw new ValidationError('Invalid category ID format');
    } else {
      const category = await prisma.expenseCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new NotFoundError('Category');
      }

      if (!category.active) {
        throw new ValidationError('Cannot assign inactive category');
      }
    }
  }

  // Validate amount if being updated
  if (data.amount !== undefined) {
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }
  }

  // Build update data (only include fields that are being updated)
  const updateData = {
    updatedById: userId,
  };

  if (data.title !== undefined) {
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Title cannot be empty');
    }
    updateData.title = data.title.trim();
  }

  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null;
  }

  if (data.amount !== undefined) {
    updateData.amount = data.amount;
  }

  if (data.date !== undefined) {
    updateData.date = new Date(data.date);
  }

  if (data.vendor !== undefined) {
    updateData.vendor = data.vendor?.trim() || null;
  }

  if (data.receiptUrl !== undefined) {
    updateData.receiptUrl = data.receiptUrl?.trim() || null;
  }

  if (data.categoryId !== undefined) {
    updateData.categoryId = data.categoryId;
  }

  // Update expense
  const updatedExpense = await prisma.expense.update({
    where: { id },
    data: updateData,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          active: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return updatedExpense;
};

/**
 * Soft delete an expense
 * @param {string} id - Expense ID
 * @param {string} userId - ID of the user deleting the expense (for audit trail)
 * @returns {Promise<boolean>} Success boolean
 */
export const softDeleteExpense = async (id, userId) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid expense ID format');
  }

  // Check if expense exists and is not already deleted
  const existingExpense = await prisma.expense.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingExpense) {
    throw new NotFoundError('Expense');
  }

  // Check if expense can be deleted (block SUBMITTED/APPROVED)
  if (existingExpense.status === 'SUBMITTED' || existingExpense.status === 'APPROVED') {
    throw new ValidationError(`Cannot delete expense with status ${existingExpense.status}. Please reject or cancel the expense first.`);
  }

  // Soft delete by setting deletedAt timestamp
  await prisma.expense.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  return true;
};

/**
 * Submit an expense for approval
 * @param {string} id - Expense ID
 * @param {string} userId - ID of the user submitting the expense
 * @returns {Promise<object>} Updated expense
 */
export const submitExpense = async (id, userId) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid expense ID format');
  }

  return await prisma.$transaction(async (tx) => {
    // Get expense with current status
    const expense = await tx.expense.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!expense) {
      throw new NotFoundError('Expense');
    }

    // Check if submission is allowed
    if (expense.status !== 'DRAFT' && expense.status !== 'REJECTED') {
      throw new ValidationError(`Cannot submit expense with status ${expense.status}. Only DRAFT or REJECTED expenses can be submitted.`);
    }

    const fromStatus = expense.status;

    // Update expense to SUBMITTED
    const updatedExpense = await tx.expense.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedById: userId,
      },
      include: {
        category: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Create approval event
    await tx.expenseApprovalEvent.create({
      data: {
        expenseId: id,
        action: 'SUBMIT',
        fromStatus,
        toStatus: 'SUBMITTED',
        performedById: userId,
      },
    });

    return updatedExpense;
  });
};

/**
 * Approve an expense
 * @param {string} id - Expense ID
 * @param {string} userId - ID of the user approving the expense
 * @param {string} comment - Optional approval comment
 * @returns {Promise<object>} Updated expense
 */
export const approveExpense = async (id, userId, comment = null) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid expense ID format');
  }

  return await prisma.$transaction(async (tx) => {
    // Get expense with current status and creator info
    const expense = await tx.expense.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: { id: true, role: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundError('Expense');
    }

    // Check if approval is allowed
    if (expense.status !== 'SUBMITTED') {
      throw new ValidationError(`Cannot approve expense with status ${expense.status}. Only SUBMITTED expenses can be approved.`);
    }

    // Get approver info
    const approver = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!approver) {
      throw new NotFoundError('User');
    }

    // ADMIN cannot approve their own expense, SUPER_ADMIN can
    if (approver.role === 'ADMIN' && expense.createdById === userId) {
      throw new ForbiddenError('You cannot approve your own expense. Please ask another admin or super admin.');
    }

    const fromStatus = expense.status;

    // Update expense to APPROVED
    const updatedExpense = await tx.expense.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: userId,
        approvalComment: comment,
      },
      include: {
        category: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Create approval event
    await tx.expenseApprovalEvent.create({
      data: {
        expenseId: id,
        action: 'APPROVE',
        fromStatus,
        toStatus: 'APPROVED',
        comment,
        performedById: userId,
      },
    });

    return updatedExpense;
  });
};

/**
 * Reject an expense
 * @param {string} id - Expense ID
 * @param {string} userId - ID of the user rejecting the expense
 * @param {string} reason - Rejection reason (required)
 * @returns {Promise<object>} Updated expense
 */
export const rejectExpense = async (id, userId, reason) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid expense ID format');
  }

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Rejection reason is required');
  }

  return await prisma.$transaction(async (tx) => {
    // Get expense with current status and creator info
    const expense = await tx.expense.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: { id: true, role: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundError('Expense');
    }

    // Check if rejection is allowed
    if (expense.status !== 'SUBMITTED') {
      throw new ValidationError(`Cannot reject expense with status ${expense.status}. Only SUBMITTED expenses can be rejected.`);
    }

    // Get rejector info
    const rejector = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!rejector) {
      throw new NotFoundError('User');
    }

    // ADMIN cannot reject their own expense, SUPER_ADMIN can
    if (rejector.role === 'ADMIN' && expense.createdById === userId) {
      throw new ForbiddenError('You cannot reject your own expense. Please ask another admin or super admin.');
    }

    const fromStatus = expense.status;

    // Update expense to REJECTED
    const updatedExpense = await tx.expense.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: userId,
        rejectionReason: reason.trim(),
      },
      include: {
        category: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        rejectedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Create approval event
    await tx.expenseApprovalEvent.create({
      data: {
        expenseId: id,
        action: 'REJECT',
        fromStatus,
        toStatus: 'REJECTED',
        comment: reason.trim(),
        performedById: userId,
      },
    });

    return updatedExpense;
  });
};

/**
 * Cancel an expense
 * @param {string} id - Expense ID
 * @param {string} userId - ID of the user cancelling the expense
 * @returns {Promise<object>} Updated expense
 */
export const cancelExpense = async (id, userId) => {
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid expense ID format');
  }

  return await prisma.$transaction(async (tx) => {
    // Get expense with current status
    const expense = await tx.expense.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!expense) {
      throw new NotFoundError('Expense');
    }

    // Check if cancellation is allowed
    if (expense.status !== 'SUBMITTED') {
      throw new ValidationError(`Cannot cancel expense with status ${expense.status}. Only SUBMITTED expenses can be cancelled.`);
    }

    // Get user info
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Only creator or SUPER_ADMIN can cancel
    if (expense.createdById !== userId && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only the expense creator or a super admin can cancel this expense.');
    }

    const fromStatus = expense.status;

    // Update expense to CANCELLED
    const updatedExpense = await tx.expense.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        category: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Create approval event
    await tx.expenseApprovalEvent.create({
      data: {
        expenseId: id,
        action: 'CANCEL',
        fromStatus,
        toStatus: 'CANCELLED',
        performedById: userId,
      },
    });

    return updatedExpense;
  });
};
