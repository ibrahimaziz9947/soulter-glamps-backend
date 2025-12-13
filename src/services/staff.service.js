import prisma from '../config/prisma.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

/**
 * Create a new staff member
 * @access SUPER_ADMIN
 */
export const createStaff = async (staffData, managedById) => {
  const { fullName, role, phone } = staffData;

  // Check if staff with same phone exists
  if (phone) {
    const existingStaff = await prisma.staff.findFirst({
      where: { phone },
    });

    if (existingStaff) {
      throw new ConflictError('A staff member with this phone number already exists');
    }
  }

  const staff = await prisma.staff.create({
    data: {
      fullName,
      role,
      phone,
      managedById,
    },
    include: {
      managedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return staff;
};

/**
 * Update staff member
 * @access SUPER_ADMIN
 */
export const updateStaff = async (staffId, staffData) => {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    throw new NotFoundError('Staff member');
  }

  // Check if phone is being updated and if it's already in use
  if (staffData.phone && staffData.phone !== staff.phone) {
    const duplicateStaff = await prisma.staff.findFirst({
      where: {
        phone: staffData.phone,
        id: { not: staffId },
      },
    });

    if (duplicateStaff) {
      throw new ConflictError('A staff member with this phone number already exists');
    }
  }

  const updatedStaff = await prisma.staff.update({
    where: { id: staffId },
    data: staffData,
    include: {
      managedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedStaff;
};

/**
 * Delete staff member
 * @access SUPER_ADMIN
 */
export const deleteStaff = async (staffId) => {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    throw new NotFoundError('Staff member');
  }

  await prisma.staff.delete({
    where: { id: staffId },
  });

  return { message: 'Staff member deleted successfully' };
};

/**
 * Get all staff members with pagination and filters
 * @access SUPER_ADMIN, ADMIN
 */
export const getAllStaff = async (filters = {}, pagination = {}) => {
  const { skip, take } = pagination;
  const { role, search } = filters;

  const where = {};

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { role: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [staff, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      skip,
      take,
      include: {
        managedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staff.count({ where }),
  ]);

  return { staff, total };
};

/**
 * Get staff member by ID
 * @access SUPER_ADMIN, ADMIN
 */
export const getStaffById = async (staffId) => {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      managedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!staff) {
    throw new NotFoundError('Staff member');
  }

  return staff;
};
