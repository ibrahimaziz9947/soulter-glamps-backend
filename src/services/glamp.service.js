import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { enhanceGlampWithPricing } from '../utils/pricing.js';

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
 * 
 * Accepts:
 * {
 *   name: string,
 *   description: string,
 *   pricePerNightCents: number,  // Price in cents
 *   maxGuests: number (capacity),
 *   status?: "ACTIVE"|"INACTIVE",
 *   features?: string[],
 *   amenities?: string[],
 *   imageUrl?: string,  // URL or path to glamp image
 *   saveAsDraft?: boolean
 * }
 * 
 * Note: Additional fields (categoryId, areaSqft, bedrooms, bathrooms, images)
 * would require schema updates and are not yet supported.
 */
export const createGlamp = async (glampData) => {
  const { 
    name, 
    description, 
    pricePerNightCents, // Accept cents-based naming
    pricePerNight,      // Also accept legacy naming
    capacity,           // Accept capacity as alias for maxGuests
    maxGuests, 
    status, 
    features = [], 
    amenities = [],
    imageUrl,           // Optional image URL
    isTest = false,     // Mark as test glamp (hidden from customers)
    saveAsDraft = false
  } = glampData;

  // Support both naming conventions for price
  const price = pricePerNightCents || pricePerNight;
  // Support both capacity and maxGuests
  const guestCapacity = capacity || maxGuests;

  // Validate required fields
  if (!name || !description || !price || !guestCapacity) {
    throw new ValidationError('Name, description, pricePerNightCents, and maxGuests (or capacity) are required');
  }

  // Validate numeric fields
  if (price <= 0) {
    throw new ValidationError('Price per night must be greater than 0');
  }

  if (guestCapacity <= 0) {
    throw new ValidationError('Max guests/capacity must be greater than 0');
  }

  // Validate status if provided
  const glampStatus = saveAsDraft ? 'INACTIVE' : (status || 'ACTIVE');
  if (!['ACTIVE', 'INACTIVE'].includes(glampStatus)) {
    throw new ValidationError('Status must be ACTIVE or INACTIVE');
  }

  const glamp = await prisma.glamp.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      pricePerNight: parseInt(price), // Stored as cents in DB
      maxGuests: parseInt(guestCapacity),
      status: glampStatus,
      features,
      amenities,
      imageUrl: imageUrl || null,
      isTest: Boolean(isTest),
      discountEnabled: false,
      discountPercent: null
    },
  });

  const enhancedGlamp = enhanceGlampWithPricing(glamp);

  console.log('[GLAMP] Created glamp:', {
    id: enhancedGlamp.id,
    name: enhancedGlamp.name,
    pricePerNightCents: enhancedGlamp.pricePerNight,
    finalPrice: enhancedGlamp.finalPrice,
    status: enhancedGlamp.status,
  });

  return enhancedGlamp;
};

/**
 * Get all glamps - Public version (customer-facing site)
 * @access Public (customers)
 * 
 * Returns ONLY:
 * - ACTIVE glamps
 * - Non-test glamps (isTest = false)
 * 
 * Sorted by name ASC for stable ordering
 */
export const getAllGlamps = async (filters = {}) => {
  const where = {
    status: 'ACTIVE',  // MUST be ACTIVE for public site
    isTest: false,     // Hide test glamps from public
  };

  const glamps = await prisma.glamp.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      pricePerNight: true,
      maxGuests: true,
      availability: true,
      imageUrl: true,
      features: true,
      amenities: true,
      status: true,
      createdAt: true,
      discountEnabled: true,
      discountPercent: true,
    },
    orderBy: { name: 'asc' },  // Stable alphabetical ordering
  });

  return glamps.map(enhanceGlampWithPricing);
};

/**
 * Get all glamps - Admin version (includes test glamps)
 * @access ADMIN, SUPER_ADMIN
 */
export const getAllGlampsAdmin = async (filters = {}) => {
  const { status, includeTest = true } = filters;

  const where = {};

  if (status) {
    where.status = status;
  }

  // Admin can filter by isTest if needed
  if (!includeTest) {
    where.isTest = false;
  }

  const glamps = await prisma.glamp.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return glamps.map(enhanceGlampWithPricing);
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

  return enhanceGlampWithPricing(glamp);
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
  if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl || null;
  if (updates.isTest !== undefined) updateData.isTest = Boolean(updates.isTest);
  if (updates.discountEnabled !== undefined) updateData.discountEnabled = Boolean(updates.discountEnabled);
  if (updates.discountPercent !== undefined) updateData.discountPercent = updates.discountPercent ? parseInt(updates.discountPercent) : null;

  const updatedGlamp = await prisma.glamp.update({
    where: { id: glampId },
    data: updateData,
  });

  return enhanceGlampWithPricing(updatedGlamp);
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
