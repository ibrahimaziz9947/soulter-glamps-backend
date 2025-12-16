import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import * as glampController from '../controllers/glamp.controller.js';

const router = express.Router();

// Public routes - Anyone can view glamps
router.get('/', glampController.getAllGlamps);
router.get('/:id', glampController.getGlampById);

// Protected routes - ADMIN and SUPER_ADMIN only
router.post('/', authRequired, requireAdmin, glampController.createGlamp);
router.put('/:id', authRequired, requireAdmin, glampController.updateGlamp);
router.delete('/:id', authRequired, requireAdmin, glampController.deleteGlamp);

export default router;
