import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../utils/auth.js';
import { initializeAchievements } from '../utils/achievements.js';

// Validation rules
export const validateRegister = [
  body('name').isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

export const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

/**
 * Register new user
 */
export const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role = 'student' } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    // Initialize achievements on first registration if needed
    await initializeAchievements();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Remove password from response
    const userResponse = {
      ...user.toObject(),
      password: undefined,
      achievements: undefined // Can populate later if needed
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Populate achievements for response
    await user.populate('achievements', 'title description points');

    // Remove password from response
    const userResponse = {
      ...user.toObject(),
      password: undefined
    };

    res.json({
      message: 'Login successful',
      user: userResponse,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
export const getMe = async (req, res) => {
  try {
    // User is attached by auth middleware
    const user = await User.findById(req.user._id).populate('achievements', 'title description points key');

    res.json({
      user: {
        ...user.toObject(),
        password: undefined
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to get user profile',
      error: error.message
    });
  }
};

/**
 * Logout (client-side should remove tokens)
 */
export const logout = (req, res) => {
  res.json({
    message: 'Logout successful. Please remove tokens from client.'
  });
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token (simplified - in production use proper JWT)
    const resetToken = generateAccessToken(user._id);

    // TODO: Send email with reset link
    // For now, just log it
    console.log(`Password reset requested for ${email}. Reset token: ${resetToken}`);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      message: 'Failed to send reset email',
      error: error.message
    });
  }
};

// Stub for Google OAuth
export const googleCallback = async (req, res) => {
  // This would be implemented with Passport.js Google strategy
  res.json({
    message: 'Google OAuth not implemented yet. Use regular registration/login.'
  });
};

// Stub for Facebook OAuth
export const facebookCallback = async (req, res) => {
  // This would be implemented with Passport.js Facebook strategy
  res.json({
    message: 'Facebook OAuth not implemented yet. Use regular registration/login.'
  });
};
