import { Router } from 'express';
import {
    register,
    login,
    logout,
    getCurrentUser,
    updateProfile,
    refreshAccessToken
} from '../controllers/userAuthController';
import { authenticate } from '../middlewares/userAuthMiddleware';

const router=Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);

// Protected routes (require authentication)
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);

export default router;

