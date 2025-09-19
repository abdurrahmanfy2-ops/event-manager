import express from 'express';
import { register, login, getMe, logout, googleCallback, forgotPassword, facebookCallback, validateRegister, validateLogin } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.get('/me', authenticate, getMe);

// Google OAuth routes
router.get('/google', (req, res) => {
  res.json({ message: 'Google OAuth not implemented. Redirect to /register or /login.' });
});

router.get('/google/callback', googleCallback);

// Facebook OAuth routes
router.get('/facebook', (req, res) => {
  res.json({ message: 'Facebook OAuth not implemented. Redirect to /register or /login.' });
});

router.get('/facebook/callback', facebookCallback);

export default router;
