import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';

const COMMISSION_RATE = 0.20; // 20% commission rate

/**
 * Create commission when booking is confirmed or completed
 * This is called automatically by the booking service
 */
export const createCommissionForBooking = async (bookingId) => {
  // Get the booking with agent info
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      agent: true,
      commission: true, // Check if commission already exists
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Only create commission if booking has an agent
  if (!booking.agentId) {
    return null;
  }

  // Don't create duplicate commission
  if (booking.commission) {
    return booking.commission;
  }

  // Calculate commission amount (20% of total booking value)
  const commissionAmount = Math.round(booking.totalAmount * COMMISSION_RATE);

  // Create the commission
  const commission = await prisma.commission.create({
    data: {
      amount: commissionAmount,
      status: 'UNPAID',
      agentId: booking.agentId,
      bookingId: booking.id,
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      booking: {
        select: {
          id: true,
          customerName: true,
          checkInDate: true,
          totalAmount: true,
          status: true,
          glamp: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return commission;
};

/**
 * Get all commissions for a specific agent
 * @access AGENT (own commissions only)
 */
export const getAgentCommissions = async (agentId, filters = {}, pagination = {}) => {
  const { status } = filters;
  const { skip, take } = pagination;

  const where = {
    agentId,
    ...(status && { status }),
  };

  const [commissions, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            customerName: true,
            checkInDate: true,
            checkOutDate: true,
            totalAmount: true,
            status: true,
            glamp: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.commission.count({ where }),
  ]);

  return { commissions, total };
};

/**
 * Get all commissions (for admins)
 * @access ADMIN, SUPER_ADMIN
 */
export const getAllCommissions = async (filters = {}, pagination = {}) => {
  const { status, agentId } = filters;
  const { skip, take } = pagination;

  const where = {
    ...(status && { status }),
    ...(agentId && { agentId: parseInt(agentId) }),
  };

  const [commissions, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        booking: {
          select: {
            id: true,
            customerName: true,
            checkInDate: true,
            checkOutDate: true,
            totalAmount: true,
            status: true,
            glamp: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.commission.count({ where }),
  ]);

  return { commissions, total };
};

/**
 * Get commission by ID
 * @access AGENT (own), ADMIN, SUPER_ADMIN (all)
 */
export const getCommissionById = async (commissionId, user) => {
  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      booking: {
        select: {
          id: true,
          customerName: true,
          checkInDate: true,
          checkOutDate: true,
          totalAmount: true,
          status: true,
          glampName: true,
          glamp: {
            select: {
              id: true,
              name: true,
              pricePerNight: true,
            },
          },
        },
      },
    },
  });

  if (!commission) {
    throw new NotFoundError('Commission');
  }

  // If user is an agent, they can only see their own commissions
  if (user.role === 'AGENT' && commission.agentId !== user.id) {
    throw new ForbiddenError('You can only view your own commissions');
  }

  return commission;
};

/**
 * Update commission status (mark as paid)
 * @access ADMIN, SUPER_ADMIN
 */
export const updateCommissionStatus = async (commissionId, status) => {
  const validStatuses = ['UNPAID', 'PAID'];

  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
  });

  if (!commission) {
    throw new NotFoundError('Commission');
  }

  const updatedCommission = await prisma.commission.update({
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
      booking: {
        select: {
          id: true,
          customerName: true,
          totalAmount: true,
          status: true,
        },
      },
    },
  });

  return updatedCommission;
};

/**
 * Get commission summary for an agent
 * @access AGENT (own), ADMIN (all)
 */
export const getCommissionSummary = async (agentId) => {
  const [totalEarned, totalPaid, totalUnpaid, commissionCount] = await Promise.all([
    prisma.commission.aggregate({
      where: { agentId },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { agentId, status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { agentId, status: 'UNPAID' },
      _sum: { amount: true },
    }),
    prisma.commission.count({
      where: { agentId },
    }),
  ]);

  return {
    totalEarned: totalEarned._sum.amount || 0,
    totalPaid: totalPaid._sum.amount || 0,
    totalUnpaid: totalUnpaid._sum.amount || 0,
    commissionCount,
    commissionRate: COMMISSION_RATE * 100, // Return as percentage
  };
};
