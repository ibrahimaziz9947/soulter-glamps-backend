import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

/**
 * Create a new glamp
 */
export const createGlamp = async (glampData, userId) => {
  const { name, description, basePrice, weekendPrice, seasonalMultiplier, capacity, amenities, images, status } = glampData;

  // Check if glamp with same name exists
  const existingGlamp = await prisma.glamp.findFirst({
    where: { name },
  });

  if (existingGlamp) {
    throw new ConflictError('A glamp with this name already exists');
  }

  const glamp = await prisma.glamp.create({
    data: {
      name,
      description,
      basePrice,
      weekendPrice,
      seasonalMultiplier,
      capacity,
      amenities,
      images,
      status: status || 'ACTIVE',
      createdById: userId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return glamp;
};

/**
 * Update an existing glamp
 */
export const updateGlamp = async (glampId, glampData) => {
  // Check if glamp exists
  const existingGlamp = await prisma.glamp.findUnique({
    where: { id: glampId },
  });

  if (!existingGlamp) {
    throw new NotFoundError('Glamp');
  }

  // If name is being updated, check for duplicates
  if (glampData.name && glampData.name !== existingGlamp.name) {
    const duplicateGlamp = await prisma.glamp.findFirst({
      where: {
        name: glampData.name,
        id: { not: glampId },
      },
    });

    if (duplicateGlamp) {
      throw new ConflictError('A glamp with this name already exists');
    }
  }

  const glamp = await prisma.glamp.update({
    where: { id: glampId },
    data: glampData,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return glamp;
};

/**
 * Delete a glamp
 */
export const deleteGlamp = async (glampId) => {
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

  // Check if glamp has bookings
  if (existingGlamp._count.bookings > 0) {
    throw new ValidationError('Cannot delete glamp with existing bookings. Consider deactivating it instead.');
  }

  await prisma.glamp.delete({
    where: { id: glampId },
  });

  return { message: 'Glamp deleted successfully' };
};

/**
 * Get glamp by ID
 */
export const getGlampById = async (glampId) => {
  const glamp = await prisma.glamp.findUnique({
    where: { id: glampId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: { bookings: true },
      },
    },
  });

  if (!glamp) {
    throw new NotFoundError('Glamp');
  }

  return glamp;
};

/**
 * Get all glamps with pagination and filters
 */
export const getAllGlamps = async (filters = {}, pagination = {}) => {
  const { skip, take } = pagination;
  const { status, minCapacity, maxPrice, search } = filters;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (minCapacity) {
    where.capacity = { gte: parseInt(minCapacity) };
  }

  if (maxPrice) {
    where.basePrice = { lte: parseInt(maxPrice) };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [glamps, total] = await Promise.all([
    prisma.glamp.findMany({
      where,
      skip,
      take,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.glamp.count({ where }),
  ]);

  return { glamps, total };
};
