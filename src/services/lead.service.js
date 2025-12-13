import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../utils/errors.js';

/**
 * Create a new lead
 * @access AGENT, ADMIN, SUPER_ADMIN
 */
export const createLead = async (leadData, agentId) => {
  const { fullName, phone, notes } = leadData;

  // Check if lead with same phone already exists for this agent
  const existingLead = await prisma.agentLead.findFirst({
    where: {
      phone,
      agentId,
    },
  });

  if (existingLead) {
    throw new ConflictError('A lead with this phone number already exists for this agent');
  }

  const lead = await prisma.agentLead.create({
    data: {
      fullName,
      phone,
      notes,
      agentId,
      status: 'PENDING',
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return lead;
};

/**
 * Assign lead to different agent
 * @access ADMIN, SUPER_ADMIN only
 */
export const assignLeadToAgent = async (leadId, newAgentId) => {
  // Check if lead exists
  const lead = await prisma.agentLead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Check if new agent exists and is an AGENT
  const agent = await prisma.user.findUnique({
    where: { id: newAgentId },
  });

  if (!agent || agent.role !== 'AGENT') {
    throw new ValidationError('Invalid agent. User must have AGENT role');
  }

  const updatedLead = await prisma.agentLead.update({
    where: { id: leadId },
    data: { agentId: newAgentId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedLead;
};

/**
 * Update lead status
 */
export const updateLeadStatus = async (leadId, status, notes, userId, userRole) => {
  const validStatuses = ['PENDING', 'IN_PROGRESS', 'CONVERTED', 'LOST'];

  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const lead = await prisma.agentLead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Agents can only update their own leads
  if (userRole === 'AGENT' && lead.agentId !== userId) {
    throw new ForbiddenError('You can only update your own leads');
  }

  const updateData = { status };
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const updatedLead = await prisma.agentLead.update({
    where: { id: leadId },
    data: updateData,
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedLead;
};

/**
 * Convert lead to booking
 * Creates a booking and marks lead as CONVERTED
 */
export const convertLeadToBooking = async (leadId, bookingData, userId, userRole) => {
  const lead = await prisma.agentLead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Agents can only convert their own leads
  if (userRole === 'AGENT' && lead.agentId !== userId) {
    throw new ForbiddenError('You can only convert your own leads');
  }

  if (lead.status === 'CONVERTED') {
    throw new ValidationError('This lead has already been converted');
  }

  // Check if glamp exists
  const glamp = await prisma.glamp.findUnique({
    where: { id: bookingData.glampId },
  });

  if (!glamp) {
    throw new NotFoundError('Glamp');
  }

  // Create booking and update lead status in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the booking
    const booking = await tx.booking.create({
      data: {
        customerName: bookingData.customerName || lead.fullName,
        customerPhone: bookingData.customerPhone || lead.phone,
        customerEmail: bookingData.customerEmail,
        checkIn: new Date(bookingData.checkIn),
        nights: bookingData.nights,
        totalAmount: bookingData.totalAmount,
        paidAmount: bookingData.paidAmount || 0,
        glampId: bookingData.glampId,
        createdById: lead.agentId,
        status: 'PENDING',
      },
      include: {
        glamp: true,
      },
    });

    // Update lead status to CONVERTED
    const updatedLead = await tx.agentLead.update({
      where: { id: leadId },
      data: { status: 'CONVERTED' },
    });

    return { booking, lead: updatedLead };
  });

  return result;
};

/**
 * Get all leads with pagination and filters
 * @access ADMIN, SUPER_ADMIN
 */
export const getAllLeads = async (filters = {}, pagination = {}) => {
  const { skip, take } = pagination;
  const { status, agentId, search } = filters;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (agentId) {
    where.agentId = parseInt(agentId);
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.agentLead.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.agentLead.count({ where }),
  ]);

  return { leads, total };
};

/**
 * Get agent's leads
 * @access AGENT
 */
export const getAgentLeads = async (agentId, filters = {}, pagination = {}) => {
  const { skip, take } = pagination;
  const { status, search } = filters;

  const where = { agentId };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.agentLead.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.agentLead.count({ where }),
  ]);

  return { leads, total };
};

/**
 * Get lead by ID
 */
export const getLeadById = async (leadId, userId, userRole) => {
  const lead = await prisma.agentLead.findUnique({
    where: { id: leadId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Agents can only view their own leads
  if (userRole === 'AGENT' && lead.agentId !== userId) {
    throw new ForbiddenError('You can only view your own leads');
  }

  return lead;
};
