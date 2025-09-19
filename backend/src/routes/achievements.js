import express from 'express';
import { getAllAchievements, getGamificationStats, awardAchievement } from '../controllers/achievements.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllAchievements);

// Protected routes
router.get('/stats', authenticate, getGamificationStats);

// Admin only routes
router.post('/award', authenticate, authorize('admin'), awardAchievement);

export default router;
