import { Router } from 'express';
import referralController from '../controllers/referralController';
import { optionalAuth } from '../middlewares/authMiddleware';

const router=Router();

/**
 * Referral Routes
 * All routes are prefixed with /v0/referral
 */

// Public routes
router.get('/', referralController.getReferralStats); // GET /v0/referral - returns referral program data with MongoDB stats
router.post('/submit', referralController.submitReferral);
router.get('/code/:code', referralController.getReferralByCode);
router.get('/my-referrals', referralController.getUserReferrals);

// Admin routes - require authentication
router.put('/:id', optionalAuth, referralController.updateReferralStatus);

export default router;

