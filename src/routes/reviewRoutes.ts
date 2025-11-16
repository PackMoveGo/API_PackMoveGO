import { Router } from 'express';
import {
    getServiceReviews,
    createReview,
    updateReview,
    deleteReview,
    approveReview
} from '../controllers/reviewController';
import { authenticate, authorize } from '../middlewares/userAuthMiddleware';

const router = Router();

// Public routes
router.get('/service/:serviceId', getServiceReviews); // Get service reviews
router.post('/', createReview); // Create a review (anonymous allowed)

// Protected routes (require authentication)
router.put('/:id', authenticate, updateReview); // Update own review
router.delete('/:id', authenticate, deleteReview); // Delete own review

// Admin routes
router.put('/:id/approve', authenticate, authorize('admin'), approveReview); // Approve review

export default router;
