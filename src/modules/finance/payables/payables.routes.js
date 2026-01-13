import express from 'express';
import * as payablesController from './payables.controller.js';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';

const router = express.Router();

// All payables routes require ADMIN or SUPER_ADMIN access

// Summary route (must be before /:purchaseId to avoid conflict)
router.get('/summary', authRequired, requireAdmin, payablesController.getPayablesSummary);

// List and payment routes
router.get('/', authRequired, requireAdmin, payablesController.listPayables);
router.post('/:purchaseId/pay', authRequired, requireAdmin, payablesController.recordPayment);

export default router;
