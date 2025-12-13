import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = express.Router();

// Example routes - to be implemented

// Get all glamps (Public - no auth)
// router.get('/glamps', getAllGlamps);

// Get single glamp (Public)
// router.get('/glamps/:id', getGlampById);

// Create glamp (ADMIN+)
// router.post('/glamps', authRequired, requireAdmin, createGlamp);

// Update glamp (ADMIN+)
// router.put('/glamps/:id', authRequired, requireAdmin, updateGlamp);

// Delete glamp (ADMIN+)
// router.delete('/glamps/:id', authRequired, requireAdmin, deleteGlamp);

// Get available glamps for date range (Public)
// router.post('/glamps/availability', checkGlampAvailability);

export default router;
