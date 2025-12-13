import * as leadService from '../services/lead.service.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * Create a new lead
 * @route POST /api/leads
 * @access AGENT, ADMIN, SUPER_ADMIN
 */
export const createLead = asyncHandler(async (req, res) => {
  const agentId = req.user.role === 'AGENT' ? req.user.id : req.body.agentId;
  
  if (!agentId) {
    return res.status(400).json({
      success: false,
      error: 'Agent ID is required',
    });
  }

  const lead = await leadService.createLead(req.body, agentId);

  return res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: lead,
  });
});

/**
 * Assign lead to agent
 * @route PATCH /api/leads/:id/assign
 * @access ADMIN, SUPER_ADMIN
 */
export const assignLeadToAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;

  if (!agentId) {
    return res.status(400).json({
      success: false,
      error: 'Agent ID is required',
    });
  }

  const lead = await leadService.assignLeadToAgent(parseInt(id), agentId);

  return res.status(200).json({
    success: true,
    message: 'Lead assigned successfully',
    data: lead,
  });
});

/**
 * Update lead status
 * @route PATCH /api/leads/:id/status
 * @access AGENT (own leads), ADMIN, SUPER_ADMIN (all leads)
 */
export const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const lead = await leadService.updateLeadStatus(
    parseInt(id),
    status,
    notes,
    req.user.id,
    req.user.role
  );

  return res.status(200).json({
    success: true,
    message: 'Lead status updated successfully',
    data: lead,
  });
});

/**
 * Convert lead to booking
 * @route POST /api/leads/:id/convert
 * @access AGENT (own leads), ADMIN, SUPER_ADMIN (all leads)
 */
export const convertLeadToBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await leadService.convertLeadToBooking(
    parseInt(id),
    req.body,
    req.user.id,
    req.user.role
  );

  return res.status(201).json({
    success: true,
    message: 'Lead converted to booking successfully',
    data: result,
  });
});

/**
 * Get all leads
 * @route GET /api/leads
 * @access ADMIN, SUPER_ADMIN
 */
export const getAllLeads = asyncHandler(async (req, res) => {
  const { page, limit, status, agentId, search } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { status, agentId, search };

  const { leads, total } = await leadService.getAllLeads(filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: leads,
    pagination: meta,
  });
});

/**
 * Get agent's leads
 * @route GET /api/leads/my-leads
 * @access AGENT
 */
export const getAgentLeads = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { status, search };

  const { leads, total } = await leadService.getAgentLeads(req.user.id, filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: leads,
    pagination: meta,
  });
});

/**
 * Get lead by ID
 * @route GET /api/leads/:id
 * @access AGENT (own leads), ADMIN, SUPER_ADMIN (all leads)
 */
export const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const lead = await leadService.getLeadById(parseInt(id), req.user.id, req.user.role);

  return res.status(200).json({
    success: true,
    data: lead,
  });
});
