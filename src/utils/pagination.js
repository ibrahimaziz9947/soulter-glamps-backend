/**
 * Pagination utility
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Number of items per page
 * @returns {object} Prisma pagination params and metadata
 */
export const getPagination = (page = 1, limit = 10) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  return {
    skip,
    take: limitNum,
    page: pageNum,
    limit: limitNum,
  };
};

/**
 * Calculate pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
export const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Build filter object for Prisma queries
 * @param {object} filters - Filter parameters
 * @returns {object} Prisma where clause
 */
export const buildFilters = (filters = {}) => {
  const where = {};

  Object.keys(filters).forEach((key) => {
    const value = filters[key];
    
    if (value !== undefined && value !== null && value !== '') {
      // Handle different filter types
      if (typeof value === 'string') {
        // Case-insensitive partial match for strings
        where[key] = {
          contains: value,
          mode: 'insensitive',
        };
      } else if (Array.isArray(value)) {
        // Array means 'in' query
        where[key] = {
          in: value,
        };
      } else {
        // Exact match for numbers, booleans, etc.
        where[key] = value;
      }
    }
  });

  return where;
};

/**
 * Build sorting object for Prisma queries
 * @param {string} sortBy - Field to sort by
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {object} Prisma orderBy clause
 */
export const buildSort = (sortBy = 'createdAt', order = 'desc') => {
  const validOrders = ['asc', 'desc'];
  const sortOrder = validOrders.includes(order.toLowerCase()) ? order.toLowerCase() : 'desc';
  
  return {
    [sortBy]: sortOrder,
  };
};
