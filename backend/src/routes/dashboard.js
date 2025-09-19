import express from 'express';
import { getDashboardStats } from '../controllers/dashboard.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

// Routes
router.get('/stats', authorize('admin'), getDashboardStats); // Admin only for dashboard stats

export default router;
