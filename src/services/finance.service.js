import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Record a payment (income)
 * @access ADMIN, SUPER_ADMIN
 */
export const recordPayment = async (paymentData) => {
  const { title, amount, source, notes, date } = paymentData;

  const income = await prisma.financeIncome.create({
    data: {
      title,
      amount,
      source,
      notes,
      date: date ? new Date(date) : new Date(),
    },
  });

  return income;
};

/**
 * Record an expense
 * @access ADMIN, SUPER_ADMIN
 */
export const recordExpense = async (expenseData) => {
  const { title, amount, category, notes, date } = expenseData;

  const expense = await prisma.financeExpense.create({
    data: {
      title,
      amount,
      category,
      notes,
      date: date ? new Date(date) : new Date(),
    },
  });

  return expense;
};

/**
 * Get payment history (income)
 * @access ADMIN, SUPER_ADMIN
 */
export const getPaymentHistory = async (filters = {}, pagination = {}) => {
  const { skip, take } = pagination;
  const { source, fromDate, toDate, search } = filters;

  const where = {};

  if (source) {
    where.source = source;
  }

  if (fromDate) {
    where.date = { ...where.date, gte: new Date(fromDate) };
  }

  if (toDate) {
    where.date = { ...where.date, lte: new Date(toDate) };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.financeIncome.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
    }),
    prisma.financeIncome.count({ where }),
  ]);

  // Calculate total amount
  const totalAmount = await prisma.financeIncome.aggregate({
    where,
    _sum: { amount: true },
  });

  return { payments, total, totalAmount: totalAmount._sum.amount || 0 };
};

/**
 * Get expense history
 * @access ADMIN, SUPER_ADMIN
 */
export const getExpenseHistory = async (filters = {}, pagination = {}) => {
  const { skip, take } = pagination;
  const { category, fromDate, toDate, search } = filters;

  const where = {};

  if (category) {
    where.category = category;
  }

  if (fromDate) {
    where.date = { ...where.date, gte: new Date(fromDate) };
  }

  if (toDate) {
    where.date = { ...where.date, lte: new Date(toDate) };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [expenses, total] = await Promise.all([
    prisma.financeExpense.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
    }),
    prisma.financeExpense.count({ where }),
  ]);

  // Calculate total amount
  const totalAmount = await prisma.financeExpense.aggregate({
    where,
    _sum: { amount: true },
  });

  return { expenses, total, totalAmount: totalAmount._sum.amount || 0 };
};

/**
 * Record agent commission
 * @access ADMIN, SUPER_ADMIN
 */
export const recordCommission = async (commissionData) => {
  const { agentId, amount, leadId } = commissionData;

  // Verify agent exists
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
  });

  if (!agent || agent.role !== 'AGENT') {
    throw new ValidationError('Invalid agent ID');
  }

  // Verify lead exists if provided
  if (leadId) {
    const lead = await prisma.agentLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundError('Lead');
    }

    // Check if commission already exists for this lead
    const existingCommission = await prisma.agentCommission.findUnique({
      where: { leadId },
    });

    if (existingCommission) {
      throw new ValidationError('Commission already recorded for this lead');
    }
  }

  const commission = await prisma.agentCommission.create({
    data: {
      agentId,
      amount,
      leadId,
      status: 'UNPAID',
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      relatedLead: true,
    },
  });

  return commission;
};

/**
 * Update commission status
 * @access ADMIN, SUPER_ADMIN
 */
export const updateCommissionStatus = async (commissionId, status) => {
  const validStatuses = ['UNPAID', 'PAID'];

  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const commission = await prisma.agentCommission.findUnique({
    where: { id: commissionId },
  });

  if (!commission) {
    throw new NotFoundError('Commission');
  }

  const updatedCommission = await prisma.agentCommission.update({
    where: { id: commissionId },
    data: { status },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      relatedLead: true,
    },
  });

  return updatedCommission;
};

/**
 * Get commission report
 * @access ADMIN, SUPER_ADMIN
 */
export const getCommissionReport = async (filters = {}, pagination = {}) => {
  const { skip, take } = pagination;
  const { agentId, status, fromDate, toDate } = filters;

  const where = {};

  if (agentId) {
    where.agentId = parseInt(agentId);
  }

  if (status) {
    where.status = status;
  }

  if (fromDate) {
    where.createdAt = { ...where.createdAt, gte: new Date(fromDate) };
  }

  if (toDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
  }

  const [commissions, total] = await Promise.all([
    prisma.agentCommission.findMany({
      where,
      skip,
      take,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        relatedLead: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.agentCommission.count({ where }),
  ]);

  // Calculate total amounts
  const totals = await prisma.agentCommission.aggregate({
    where,
    _sum: { amount: true },
  });

  const paidTotals = await prisma.agentCommission.aggregate({
    where: { ...where, status: 'PAID' },
    _sum: { amount: true },
  });

  const unpaidTotals = await prisma.agentCommission.aggregate({
    where: { ...where, status: 'UNPAID' },
    _sum: { amount: true },
  });

  return {
    commissions,
    total,
    summary: {
      totalAmount: totals._sum.amount || 0,
      paidAmount: paidTotals._sum.amount || 0,
      unpaidAmount: unpaidTotals._sum.amount || 0,
    },
  };
};

/**
 * Get financial summary
 * @access ADMIN, SUPER_ADMIN
 */
export const getFinancialSummary = async (filters = {}) => {
  const { fromDate, toDate } = filters;

  const dateFilter = {};
  if (fromDate) {
    dateFilter.gte = new Date(fromDate);
  }
  if (toDate) {
    dateFilter.lte = new Date(toDate);
  }

  const where = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

  const [incomeTotal, expenseTotal, commissionTotal] = await Promise.all([
    prisma.financeIncome.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.financeExpense.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.agentCommission.aggregate({
      where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = incomeTotal._sum.amount || 0;
  const totalExpense = expenseTotal._sum.amount || 0;
  const totalCommission = commissionTotal._sum.amount || 0;
  const netProfit = totalIncome - totalExpense - totalCommission;

  return {
    totalIncome,
    totalExpense,
    totalCommission,
    netProfit,
  };
};
