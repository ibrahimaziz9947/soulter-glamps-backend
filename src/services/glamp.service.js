import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Validate UUID format
 */
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Create a new glamp
 * @access ADMIN, SUPER_ADMIN
 */
export const createGlamp = async (glampData) => {
  const { name, description, pricePerNight, maxGuests, status, features = [], amenities = [] } = glampData;

  // Validate required fields
  if (!name || !description || !pricePerNight || !maxGuests) {
    throw new ValidationError('Name, description, pricePerNight, and maxGuests are required');
  }

  // Validate numeric fields
  if (pricePerNight <= 0) {
    throw new ValidationError('Price per night must be greater than 0');
  }

  if (maxGuests <= 0) {
    throw new ValidationError('Max guests must be greater than 0');
  }

  // Validate status if provided
  if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
    throw new ValidationError('Status must be ACTIVE or INACTIVE');
  }

  const glamp = await prisma.glamp.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      pricePerNight: parseInt(pricePerNight),
      maxGuests: parseInt(maxGuests),
      status: status || 'ACTIVE',
      features,
      amenities
    },
  });

  return glamp;
};

/**
 * Get all glamps
 * @access Public
 */
export const getAllGlamps = async (filters = {}) => {
  const { status } = filters;

  const where = {};

  if (status) {
    where.status = status;
  }

  const glamps = await prisma.glamp.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return glamps;
};

/**
 * Get glamp by ID
 * @access Public
 */
export const getGlampById = async (glampId) => {
  if (!isValidUUID(glampId)) {
    throw new ValidationError('Invalid glamp ID format');
  }

  const glamp = await prisma.glamp.findUnique({
    where: { id: glampId },
  });

  if (!glamp) {
    throw new NotFoundError('Glamp');
  }

  return glamp;
};

/**
 * Update glamp
 * @access ADMIN, SUPER_ADMIN
 */
export const updateGlamp = async (glampId, updates) => {
  if (!isValidUUID(glampId)) {
    throw new ValidationError('Invalid glamp ID format');
  }

  const existingGlamp = await prisma.glamp.findUnique({
    where: { id: glampId },
  });

  if (!existingGlamp) {
    throw new NotFoundError('Glamp');
  }

  // Validate updates
  if (updates.pricePerNight !== undefined && updates.pricePerNight <= 0) {
    throw new ValidationError('Price per night must be greater than 0');
  }

  if (updates.maxGuests !== undefined && updates.maxGuests <= 0) {
    throw new ValidationError('Max guests must be greater than 0');
  }

  if (updates.status && !['ACTIVE', 'INACTIVE'].includes(updates.status)) {
    throw new ValidationError('Status must be ACTIVE or INACTIVE');
  }

  // Prepare update data
  const updateData = {};
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.description !== undefined) updateData.description = updates.description.trim();
  if (updates.pricePerNight !== undefined) updateData.pricePerNight = parseInt(updates.pricePerNight);
  if (updates.maxGuests !== undefined) updateData.maxGuests = parseInt(updates.maxGuests);
  if (updates.status !== undefined) updateData.status = updates.status;

  const updatedGlamp = await prisma.glamp.update({
    where: { id: glampId },
    data: updateData,
  });

  return updatedGlamp;
};

/**
 * Delete glamp
 * @access ADMIN, SUPER_ADMIN
 */
export const deleteGlamp = async (glampId) => {
  if (!isValidUUID(glampId)) {
    throw new ValidationError('Invalid glamp ID format');
  }

  // Check if glamp exists
  const existingGlamp = await prisma.glamp.findUnique({
    where: { id: glampId },
    include: {
      _count: {
        select: { bookings: true },
      },
    },
  });

  if (!existingGlamp) {
    throw new NotFoundError('Glamp');
  }

  // Delete glamp (CASCADE will handle related bookings)
  await prisma.glamp.delete({
    where: { id: glampId },
  });

  return {
    id: glampId,
    deletedBookings: existingGlamp._count.bookings,
  };
};
