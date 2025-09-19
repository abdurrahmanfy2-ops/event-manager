import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        message: 'User not found'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Access token has expired'
      });
    }

    console.error('Authentication error:', error);
    return res.status(401).json({
      message: 'Invalid access token'
    });
  }
};

// Authorization middleware for roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Optional: Middleware to check if user owns resource or is admin
export const isOwnerOrAdmin = (modelName) => {
  return async (req, res, next) => {
    try {
      const model = mongoose.model(modelName);
      const resource = await model.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({
          message: `${modelName} not found`
        });
      }

      // Check if user owns the resource or is admin
      if (resource.user?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Only resource owner or admin can access this'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        message: 'Server error'
      });
    }
  };
};
