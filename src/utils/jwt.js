import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Sign a JWT token
 * @param {object} payload - Data to encode in token (must include userId and role)
 * @returns {string} JWT token
 */
export const signToken = (payload) => {
  // Ensure payload includes userId and role
  if (!payload.userId || !payload.role) {
    throw new Error('JWT payload must include userId and role');
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
