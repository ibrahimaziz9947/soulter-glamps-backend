/**
 * Admin Staff Management Service
 * Creates and manages User records with ADMIN/SUPER_ADMIN roles
 */

import prisma from '../../../config/prisma.js';
import { hashPassword } from '../../../utils/hash.js';
import { ValidationError, ConflictError } from '../../../utils/errors.js';

/**
 * Generate a random temporary password
 */
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Create a new staff member (User with ADMIN role)
 * @param {Object} staffData - Staff member data
 * @param {string} staffData.fullName - Full name
 * @param {string} staffData.email - Email address
 * @param {string} [staffData.phone] - Phone number (optional)
 * @param {string} staffData.role - Role (ADMIN or SUPER_ADMIN)
 * @param {string} [staffData.password] - Password (auto-generated if not provided)
 * @returns {Promise<Object>} Created staff user with temp password if generated
 */
export const createStaffMember = async (staffData) => {
  const { fullName, email, phone, role, password } = staffData;

  // Validate required fields
  if (!fullName || !email || !role) {
    throw new ValidationError('Full name, email, and role are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email address format');
  }

  // Validate role
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new ValidationError('Role must be ADMIN or SUPER_ADMIN');
  }

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError(`A user with email ${email} already exists`);
  }

  // Generate or use provided password
  const tempPassword = password || generateTempPassword();
  const hashedPassword = await hashPassword(tempPassword);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  console.log('[ADMIN STAFF] Created staff member:', {
    id: user.id,
    email: user.email,
    role: user.role,
  });

  // Return user with temp password if it was auto-generated
  return {
    user,
    tempPassword: password ? undefined : tempPassword, // Only return if auto-generated
  };
};
