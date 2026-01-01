import * as AgentBookingService from '../services/agent-bookings.service.js'

export async function getAgentBookings(req, res) {
  try {
    const agentId = req.user.id
    const bookings = await AgentBookingService.getBookingsByAgent(agentId)

    res.json({ success: true, data: bookings })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}


export async function createAgentBooking(req, res) {
  try {
    const agentId = req.user.id
    const payload = req.body

    const booking = await AgentBookingService.createBookingAsAgent(
      agentId,
      payload
    )

    res.status(201).json({ success: true, data: booking })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
}





export async function getAgentBookingById(req, res) {
  try {
    const agentId = req.user.id
    const bookingId = req.params.id

    const booking = await AgentBookingService.getAgentBookingById(
      agentId,
      bookingId
    )

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' })
    }

    res.json({ success: true, data: booking })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}






export async function cancelAgentBooking(req, res) {
  try {
    const agentId = req.user.id
    const bookingId = req.params.id

    const booking = await AgentBookingService.cancelAgentBooking(
      agentId,
      bookingId
    )

    res.json({ success: true, data: booking })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
}
