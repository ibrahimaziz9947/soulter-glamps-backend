import prisma from '../config/prisma.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    // 🔍 DEBUG: Log incoming request
    console.log('========================================');
    console.log('🔵 LOGIN REQUEST RECEIVED');
    console.log('Method:', req.method);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', {
      origin: req.headers.origin,
      'content-type': req.headers['content-type'],
    });
    console.log('========================================');

    const { email, password } = req.body;

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

    console.log('✅ User found:', { id: user.id, email: user.email, role: user.role });

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

    // Sign JWT token
    const token = signToken({ userId: user.id });
    console.log('✅ JWT token generated for user:', user.email, 'Role:', user.role);

    // Set HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    
    res.cookie('auth_token', token, cookieOptions);
    
    console.log('✅ Cookie set: auth_token');
    console.log('   User Role:', user.role);
    console.log('   User Email:', user.email);
    console.log('   Cookie Options:', cookieOptions);
    console.log('   Token (first 20 chars):', token.substring(0, 20) + '...');

    // Return success response
    console.log('🟢 Sending success response for role:', user.role);
    return res.status(200).json({
      success: true,
      token,
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
