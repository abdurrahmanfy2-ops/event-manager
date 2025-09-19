import express from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
  addComment,
  rateEvent,
  validateCreateEvent,
  validateUpdateEvent
} from '../controllers/events.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllEvents);
router.get('/:id', getEventById);

// Protected routes - require authentication
router.use(authenticate);

// Routes that require specific permissions or club membership
router.post('/', validateCreateEvent, createEvent); // Club members only based on controller logic
router.put('/:id', validateUpdateEvent, updateEvent); // Creators only based on controller logic
router.delete('/:id', authorize('admin'), deleteEvent); // Admin or creators

// User participation routes
router.post('/:id/join', joinEvent);
router.post('/:id/leave', leaveEvent);
router.post('/:id/comments', addComment);
router.put('/:id/rate', rateEvent);

export default router;
