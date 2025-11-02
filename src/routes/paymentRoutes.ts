import { Router } from 'express';
import paymentController from '../controllers/paymentController';
import { optionalAuth } from '../middlewares/authMiddleware';

const router = Router();

// Payment intent routes
router.post('/payment-intent', optionalAuth, paymentController.createPaymentIntent);
router.post('/confirm-payment', optionalAuth, paymentController.confirmPayment);

// Payment status routes
router.get('/payments/:paymentId/status', optionalAuth, paymentController.getPaymentStatus);
router.get('/bookings/:bookingId/payments', optionalAuth, paymentController.getBookingPayments);

// Refund routes
router.post('/refunds', optionalAuth, paymentController.refundPayment);

// Webhook routes
router.post('/webhook', paymentController.handleWebhook);

export default router; 