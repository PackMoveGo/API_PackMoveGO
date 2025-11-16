import { Router } from 'express';
import * as quoteController from '../controllers/quoteController';
import { optionalAuth } from '../middlewares/authMiddleware';

const router=Router();

/**
 * Quote Routes
 * All routes are prefixed with /v0/quotes
 */

// Public routes
router.post('/submit', quoteController.submitQuote);
router.get('/check-limit', quoteController.checkQuoteLimit); // Check if IP can submit

// Admin routes - require authentication
router.get('/', optionalAuth, quoteController.getAllQuotes);
router.put('/:id', optionalAuth, quoteController.updateQuoteStatus);

export default router;

