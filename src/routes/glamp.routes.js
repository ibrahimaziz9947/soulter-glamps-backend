import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import * as glampController from '../controllers/glamp.controller.js';

const router = express.Router();

// Public routes (view glamping sites)
router.get('/glamps', glampController.getAllGlamps);
router.get('/glamps/:id', glampController.getGlampById);

// Protected routes (admin management)
router.post('/glamps', authRequired, requireAdmin, glampController.createGlamp);
router.put('/glamps/:id', authRequired, requireAdmin, glampController.updateGlamp);
router.delete('/glamps/:id', authRequired, requireAdmin, glampController.deleteGlamp);

export default router;
