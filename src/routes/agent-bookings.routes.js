import express from 'express'
import { authRequired } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'
import {
  getAgentBookings,
  getAgentBookingById,
  createAgentBooking,
  cancelAgentBooking
} from '../controllers/agent-bookings.controller.js'

const router = express.Router()

router.use(authRequired)
router.use(requireRole('AGENT'))

router.get('/', getAgentBookings)
router.post('/', createAgentBooking)
router.get('/:id', getAgentBookingById)
router.post('/:id/cancel', cancelAgentBooking)

export default router
