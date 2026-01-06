/*import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get all bookings created by an agent
 *
export async function getBookingsByAgent(agentId) {
  return prisma.booking.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    include: {
      glamp: {
        select: {
          name: true,
          pricePerNight: true,
        },
      },
    },
  })
} 

export async function createBookingAsAgent(agentId, payload) {
  const {
    customerName,
    customerEmail,
    customerPhone, // kept for future use (not stored)
    glampId,
    checkInDate,
    checkOutDate,
    guests,
  } = payload

  if (
    !customerName ||
    !customerEmail ||
    !glampId ||
    !checkInDate ||
    !checkOutDate ||
    !guests
  ) {
    throw new Error('Missing required fields')
  }

  // Fetch glamp price
  const glamp = await prisma.glamp.findUnique({
    where: { id: glampId },
    select: {
      pricePerNight: true,
    },
  })

  if (!glamp) {
    throw new Error('Invalid glamp selected')
  }

  // Convert dates to Date objects
  const checkIn = new Date(checkInDate)
  const checkOut = new Date(checkOutDate)

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error('Invalid check-in or check-out date')
  }

  // Calculate nights
  const nights =
    Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) /
        (1000 * 60 * 60 * 24)
    ) || 1

  // Calculate total amount
  const totalAmount = nights * glamp.pricePerNight

  return prisma.booking.create({
    data: {
      customerName,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests,
      status: 'PENDING',
      totalAmount,

      agent: {
        connect: { id: agentId },
      },

      glamp: {
        connect: { id: glampId },
      },

      customer: {
        connectOrCreate: {
          where: { email: customerEmail },
          create: {
            email: customerEmail,
            name: customerName,
            role: 'CUSTOMER',
            active: true,
            password: 'AGENT_CREATED',
          },
        },
      },
    },
  })
}

/**
 * Get a single booking created by an agent
 *
export async function getAgentBookingById(agentId, bookingId) {
  return prisma.booking.findFirst({
    where: {
      id: bookingId,
      agentId,
    },
    include: {
      glamp: {
        select: {
          name: true,
          pricePerNight: true,
        },
      },
    },
  })
} */

  






import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get all bookings created by an agent
 */
export async function getBookingsByAgent(agentId) {
  return prisma.booking.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    include: {
      glamp: {
        select: {
          name: true,
          pricePerNight: true,
        },
      },
    },
  })
}

/**
 * Create booking as agent
 */
export async function createBookingAsAgent(agentId, payload) {
  const {
    customerName,
    customerEmail,
    customerPhone, // kept for future use (not stored)
    glampId,
    checkInDate,
    checkOutDate,
    guests,
  } = payload

  if (
    !customerName ||
    !customerEmail ||
    !glampId ||
    !checkInDate ||
    !checkOutDate ||
    !guests
  ) {
    throw new Error('Missing required fields')
  }

  // 🔹 Fetch glamp (FIX: include name)
  const glamp = await prisma.glamp.findUnique({
    where: { id: glampId },
    select: {
      name: true,
      pricePerNight: true,
    },
  })

  if (!glamp) {
    throw new Error('Invalid glamp selected')
  }

  // Convert dates
  const checkIn = new Date(checkInDate)
  const checkOut = new Date(checkOutDate)

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error('Invalid check-in or check-out date')
  }

  // Calculate nights
  const nights =
    Math.max(
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      1
    )

  // Calculate total amount
  const totalAmount = nights * glamp.pricePerNight

  return prisma.booking.create({
    data: {
      customerName,
      customerEmail, // optional but useful
      glampName: glamp.name, // ✅ FIXED HERE
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests,
      status: 'PENDING',
      totalAmount,

      agent: {
        connect: { id: agentId },
      },

      glamp: {
        connect: { id: glampId },
      },

      customer: {
        connectOrCreate: {
          where: { email: customerEmail },
          create: {
            email: customerEmail,
            name: customerName,
            role: 'CUSTOMER',
            active: true,
            password: 'AGENT_CREATED',
          },
        },
      },
    },
  })
}

/**
 * Get a single booking created by an agent
 */
export async function getAgentBookingById(agentId, bookingId) {
  return prisma.booking.findFirst({
    where: {
      id: bookingId,
      agentId,
    },
    include: {
      glamp: {
        select: {
          name: true,
          pricePerNight: true,
        },
      },
    },
  })
}







