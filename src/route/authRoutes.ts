import express from 'express';
import { handleLogin, handleLogout, checkAuthStatus, authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Login endpoint
router.post('/login', handleLogin);

// Logout endpoint
router.post('/logout', handleLogout);

// Check authentication status
router.get('/status', checkAuthStatus);

// Protected route example
router.get('/protected', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Access granted to protected resource',
    timestamp: new Date().toISOString()
  });
});

export default router; 