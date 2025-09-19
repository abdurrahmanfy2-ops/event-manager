import express from 'express';
import {
  getAllClubs,
  getClubById,
  createClub,
  updateClub,
  joinClub,
  leaveClub
} from '../controllers/clubs.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All clubs routes require authentication
router.use(authenticate);

// Routes
router.get('/', getAllClubs);
router.get('/:id', getClubById);

// Admin only routes
router.post('/', authorize('admin'), createClub);
router.put('/:id', authorize('admin'), updateClub);

// User membership routes
router.post('/:id/join', joinClub);
router.post('/:id/leave', leaveClub);

export default router;
