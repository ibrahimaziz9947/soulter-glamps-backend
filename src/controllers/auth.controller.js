import prisma from '../config/prisma.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';

/**
 * Helper function for role-specific login
 */
const loginWithRole = async (req, res, expectedRole) => {
  try {
    console.log('========================================');
    console.log(`🔵 ${expectedRole} LOGIN REQUEST RECEIVED`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Expected Role:', expectedRole);
    console.log('========================================');

    const { email, password } = req.body;
    console.log('LOGIN ATTEMPT:', email, expectedRole);

    // Validate input
    if (!email || !password) {
      console.log('❌ Validation failed: Missing email or password');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    console.log('✅ Input validation passed');

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        active: true,
        name: true,
      },
    });

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    console.log('USER FOUND:', user?.role);
    console.log('✅ User found:', { id: user.id, email: user.email, role: user.role, active: user.active });

    // Check if user is active
    if (!user.active) {
      console.log('❌ User account is inactive');
      return res.status(403).json({
        success: false,
        error: 'Account is inactive. Please contact administrator.',
      });
    }

    console.log('✅ User account is active');

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    console.log('✅ Password verified successfully');

    // CRITICAL: Check if user's role matches expected role
    if (user.role !== expectedRole) {
      console.log(`❌ Role mismatch: User has role ${user.role}, but ${expectedRole} login requires ${expectedRole}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ Role validation passed:', user.role);

    // Sign JWT token with userId and role
    console.log('🔑 Creating JWT with payload:', { userId: user.id, role: user.role });
    const token = signToken({ userId: user.id, role: user.role });
    console.log('✅ JWT token generated for user:', user.email, 'Role:', user.role);

    // Set HTTP-only cookie with production-ready settings
    const isProduction = process.env.NODE_ENV === 'production';
    // Always set domain to .vercel.app in production unless overridden by COOKIE_DOMAIN
    let cookieDomain = undefined;
    if (isProduction) {
      cookieDomain = process.env.COOKIE_DOMAIN || '.vercel.app';
    }
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain in production
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      ...(cookieDomain ? { domain: cookieDomain } : {})
    };

    res.cookie('auth_token', token, cookieOptions);
    
    console.log('✅ Cookie set: auth_token');
    console.log('   User Role:', user.role);
    console.log('   User Email:', user.email);
    console.log('   Cookie Options:', cookieOptions);
    console.log('   Token (first 20 chars):', token.substring(0, 20) + '...');

    // Return success response (cookie-only auth, no token in body)
    console.log('🟢 Sending success response for role:', user.role);
    console.log('========================================\n');
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('🔴 LOGIN ERROR:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during login',
    });
  }
};

/**
 * Admin login - Only allows users with role ADMIN
 */
export const adminLogin = async (req, res) => {
  return loginWithRole(req, res, 'ADMIN');
};

/**
 * Agent login - Only allows users with role AGENT
 */
export const agentLogin = async (req, res) => {
  return loginWithRole(req, res, 'AGENT');
};

/**
 * Super Admin login - Only allows users with role SUPER_ADMIN
 */
export const superAdminLogin = async (req, res) => {
  return loginWithRole(req, res, 'SUPER_ADMIN');
};

/**
 * Generic login (deprecated - use role-specific endpoints)
 * Kept for backward compatibility - defaults to Admin login
 */
export const login = async (req, res) => {
  return adminLogin(req, res);
};

/**
 * Create new user (SUPER_ADMIN only)
 */
export const createUser = async (req, res) => {
  try {
    const { email, password, role, name } = req.body;

    // Validate input
    if (!email || !password || !role || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, role, and name are required',
      });
    }

    // Validate role
    const allowedRoles = ['ADMIN', 'AGENT'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Allowed roles: ADMIN, AGENT',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        name,
        active: true,   // <-- FIXED (was isActive)
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,   // <-- FIXED (was isActive)
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating user',
    });
  }
};
