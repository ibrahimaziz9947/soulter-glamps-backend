import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/prisma.js';

/**
 * Authentication middleware - verifies JWT token from cookie or Authorization header
 */
export const authRequired = async (req, res, next) => {
  try {
    let token;

    // 1. Try to get token from auth_token cookie (primary method)
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
      console.log('🔵 Token found in cookie');
    }
    // 2. Fallback: Get token from Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
      console.log('🔵 Token found in Authorization header');
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Please login first.',
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    console.log('✅ Token verified for user:', decoded.userId);

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive',
      });
    }

    console.log('✅ User authenticated:', user.email, 'Role:', user.role);

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return res.status(401).json({
      success: false,
      error: error.message || 'Invalid token',
    });
  }
};

/**
 * Alias for authRequired (for consistency with allowRoles)
 */
export const protectRoute = authRequired;
