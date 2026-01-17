import express from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/roles.js';
import * as statementsController from './statements.controller.js';

const router = express.Router();

// All statements routes require ADMIN or SUPER_ADMIN access

// Get financial statements (ledger view)
router.get('/', authRequired, requireAdmin, statementsController.getStatements);

export default router;
