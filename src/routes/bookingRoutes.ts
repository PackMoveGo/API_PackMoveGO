import { Router } from 'express';
import bookingController from '../controllers/bookingController';
import { optionalAuth } from '../middlewares/authMiddleware';

const router = Router();

// Quote routes
router.post('/quotes', optionalAuth, bookingController.createQuote);
router.get('/quotes/:customerId', optionalAuth, bookingController.getCustomerQuotes);

// Booking routes
router.post('/bookings', optionalAuth, bookingController.createBooking);
router.get('/bookings/:bookingId', optionalAuth, bookingController.getBooking);
router.patch('/bookings/:bookingId/status', optionalAuth, bookingController.updateBookingStatus);

// Tracking routes
router.patch('/tracking/:bookingId/location', optionalAuth, bookingController.updateTrackingLocation);

// Mover routes
router.get('/movers/available', optionalAuth, bookingController.getAvailableMovers);

export default router; 