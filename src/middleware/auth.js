import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/prisma.js';

/**
 * Authentication middleware - verifies JWT token from cookie or Authorization header
 */
export const authRequired = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in Authorization header (Bearer)
    const hasAuthHeader = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
    
    // Check for token in cookie (if using cookie-based auth)
    const hasCookieToken = req.cookies && req.cookies.token;
    
    // Debug logging for auth token detection (non-production only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 Auth check for:', req.method, req.originalUrl);
      console.log('   hasAuthHeader:', hasAuthHeader);
      console.log('   hasCookieToken:', hasCookieToken);
      console.log('   Origin:', req.headers.origin);
    }
    
    // Get token from Authorization header (preferred)
    if (hasAuthHeader) {
      token = req.headers.authorization.substring(7);
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔵 Token found in Authorization header');
      }
    }
    // Fallback to cookie if no header
    else if (hasCookieToken) {
      token = req.cookies.token;
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔵 Token found in cookie');
      }
    }
    
    if (!token) {
      console.log('❌ No token found - rejecting request');
      return res.status(401).json({
        success: false,
        error: 'No token provided. Please login first.',
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    console.log('🔓 Token decoded:', JSON.stringify(decoded));
    console.log('✅ Token verified for user:', decoded.userId);

    // Validate userId is a valid UUID string (not an old integer ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof decoded.userId !== 'string' || !uuidRegex.test(decoded.userId)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format. Please login again.',
      });
    }

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

    // Debug logging for user role (non-production only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ User authenticated:', user.email);
      console.log('   resolvedUserRole:', user.role);
    } else {
      console.log('✅ User authenticated:', user.email, 'Role:', user.role);
    }

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
