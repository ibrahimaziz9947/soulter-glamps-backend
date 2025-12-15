import * as commissionService from '../services/commission.service.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';

/**
 * Get my commissions (for logged-in agent)
 * @route GET /api/agent/commissions
 * @access AGENT
 */
export const getMyCommissions = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { status };

  const { commissions, total } = await commissionService.getAgentCommissions(
    req.user.id,
    filters,
    pagination
  );
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: commissions,
    pagination: meta,
  });
});

/**
 * Get commission summary for logged-in agent
 * @route GET /api/agent/commissions/summary
 * @access AGENT
 */
export const getMyCommissionSummary = asyncHandler(async (req, res) => {
  const summary = await commissionService.getCommissionSummary(req.user.id);

  return res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * Get all commissions (for admins)
 * @route GET /api/commissions
 * @access ADMIN, SUPER_ADMIN
 */
export const getAllCommissions = asyncHandler(async (req, res) => {
  const { page, limit, status, agentId } = req.query;
  
  const pagination = getPagination(page, limit);
  const filters = { status, agentId };

  const { commissions, total } = await commissionService.getAllCommissions(filters, pagination);
  const meta = getPaginationMeta(total, pagination.page, pagination.limit);

  return res.status(200).json({
    success: true,
    data: commissions,
    pagination: meta,
  });
});

/**
 * Get commission by ID
 * @route GET /api/commissions/:id
 * @access AGENT (own), ADMIN, SUPER_ADMIN
 */
export const getCommissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const commission = await commissionService.getCommissionById(parseInt(id), req.user);

  return res.status(200).json({
    success: true,
    data: commission,
  });
});

/**
 * Update commission status (mark as paid/unpaid)
 * @route PATCH /api/commissions/:id/status
 * @access ADMIN, SUPER_ADMIN
 */
export const updateCommissionStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const commission = await commissionService.updateCommissionStatus(parseInt(id), status);

  return res.status(200).json({
    success: true,
    message: 'Commission status updated successfully',
    data: commission,
  });
});

/**
 * Get commission summary for a specific agent (admin only)
 * @route GET /api/commissions/agent/:agentId/summary
 * @access ADMIN, SUPER_ADMIN
 */
export const getAgentCommissionSummary = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const summary = await commissionService.getCommissionSummary(parseInt(agentId));

  return res.status(200).json({
    success: true,
    data: summary,
  });
});
