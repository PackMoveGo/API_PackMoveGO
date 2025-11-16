import { Router } from 'express';
import {
    getUserAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    getAvailableUsers,
    bookTimeSlot,
    releaseTimeSlot
} from '../controllers/availabilityController';
import { authenticate } from '../middlewares/userAuthMiddleware';

const router = Router();

// Public routes
router.get('/available/:date', getAvailableUsers); // Get available users for a specific date

// Protected routes (require authentication)
router.get('/:userId', getUserAvailability); // Get user's availability
router.post('/', authenticate, createAvailability); // Create availability
router.put('/:id', authenticate, updateAvailability); // Update availability
router.delete('/:id', authenticate, deleteAvailability); // Delete availability
router.post('/:id/book', bookTimeSlot); // Book a time slot
router.post('/:id/release', releaseTimeSlot); // Release a time slot

export default router;

