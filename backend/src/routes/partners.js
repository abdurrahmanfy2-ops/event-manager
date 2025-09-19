import express from 'express';
import { getAllPartners, createPartner } from '../controllers/partners.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllPartners);

// Admin only routes
router.post('/', authenticate, authorize('admin'), createPartner);

export default router;
