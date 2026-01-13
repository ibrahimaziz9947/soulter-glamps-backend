import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as purchaseController from './purchase.controller.js';

const router = express.Router();

// All purchase routes require ADMIN or SUPER_ADMIN access

// Summary route (must be before /:id to avoid conflict)
router.get('/summary', authRequired, requireAdmin, purchaseController.getPurchasesSummary);

// CRUD routes
router.post('/', authRequired, requireAdmin, purchaseController.createPurchase);
router.get('/', authRequired, requireAdmin, purchaseController.listPurchases);
router.get('/:id', authRequired, requireAdmin, purchaseController.getPurchaseById);
router.patch('/:id', authRequired, requireAdmin, purchaseController.updatePurchase);
router.delete('/:id', authRequired, requireAdmin, purchaseController.deletePurchase);

// Restore route
router.post('/:id/restore', authRequired, requireAdmin, purchaseController.restorePurchase);

export default router;
