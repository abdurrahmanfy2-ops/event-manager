import express from 'express';
import { getProfile, updateProfile, getUserById } from '../controllers/users.js';
import { authenticate, validateUpdateProfile } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/profile', getProfile);
router.put('/profile', validateUpdateProfile, updateProfile);
router.get('/:id', getUserById);

export default router;
