import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Hash user password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export const hashPassword = async (password) => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare plain password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hashed - Hashed password from database
 * @returns {Promise<boolean>} - True if matches
 */
export const comparePassword = async (password, hashed) => {
  return bcrypt.compare(password, hashed);
};

/**
 * Generate access JWT token
 * @param {string} userId - User ID
 * @returns {string} - JWT access token
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
  });
};

/**
 * Generate refresh JWT token
 * @param {string} userId - User ID
 * @returns {string} - JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d'
  });
};

/**
 * Extract token from Bearer header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null
 */
export const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
};
