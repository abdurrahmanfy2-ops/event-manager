import express from 'express';
import { getAllColleges, createCollege } from '../controllers/colleges.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllColleges);

// Admin only routes
router.post('/', authenticate, authorize('admin'), createCollege);

export default router;
