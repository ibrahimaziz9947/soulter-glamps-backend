/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated (should be used after authRequired middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Alternative method for role checking (alias for requireRole)
 */
export const allowRoles = (...roles) => requireRole(...roles);

// Convenience middleware for common role combinations
export const requireSuperAdmin = requireRole('SUPER_ADMIN');
export const requireAdmin = requireRole('SUPER_ADMIN', 'ADMIN');
export const requireAgent = requireRole('SUPER_ADMIN', 'ADMIN', 'AGENT');
