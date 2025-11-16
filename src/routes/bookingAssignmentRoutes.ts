import { Router } from 'express';
import {
    getUserBookings,
    getAvailableBookings,
    acceptBooking,
    declineBooking,
    updateBookingStatus,
    createBooking
} from '../controllers/bookingAssignmentController';
import { authenticate } from '../middlewares/userAuthMiddleware';

const router = Router();

// Public routes
router.post('/', createBooking); // Create a new booking
router.get('/available', getAvailableBookings); // Get available bookings to claim

// Protected routes (require authentication)
router.get('/user/:userId', authenticate, getUserBookings); // Get user's bookings
router.put('/:id/accept', authenticate, acceptBooking); // Accept a booking
router.put('/:id/decline', authenticate, declineBooking); // Decline a booking
router.put('/:id/status', authenticate, updateBookingStatus); // Update booking status

export default router;

