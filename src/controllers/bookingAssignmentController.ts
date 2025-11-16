import { Request, Response } from 'express';
import Booking from '../models/Booking';
import { connectToUserDatabase } from '../database/mongodb-user-connection';
import { AuthRequest } from '../controllers/userAuthController';
import mongoose from 'mongoose';

/**
 * Get all bookings for a specific user
 * GET /api/bookings/user/:userId
 */
export const getUserBookings = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        const { userId } = req.params;
        const { status } = req.query;
        
        // Build query
        const query: any = {
            assignedUsers: new mongoose.Types.ObjectId(userId)
        };
        
        // Add status filter if provided
        if (status) {
            query.status = status;
        }
        
        const bookings = await Booking.find(query)
            .populate('assignedUsers', 'firstName lastName email role')
            .sort({ date: -1 });
        
        return res.status(200).json({
            success: true,
            data: {
                bookings,
                count: bookings.length
            }
        });
    } catch (error: any) {
        console.error('Get user bookings error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching bookings',
            error: error.message
        });
    }
};

/**
 * Get available bookings that haven't been assigned
 * GET /api/bookings/available
 */
export const getAvailableBookings = async (req: Request, res: Response) => {
    try {
        await connectToUserDatabase();
        
        const { date } = req.query;
        
        // Build query for unassigned or partially assigned bookings
        const query: any = {
            status: 'pending'
        };
        
        // Add date filter if provided
        if (date) {
            query.date = new Date(date as string);
        }
        
        const bookings = await Booking.find(query).sort({ date: 1 });
        
        return res.status(200).json({
            success: true,
            data: {
                bookings,
                count: bookings.length
            }
        });
    } catch (error: any) {
        console.error('Get available bookings error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching available bookings',
            error: error.message
        });
    }
};

/**
 * Accept a booking
 * PUT /api/bookings/:id/accept
 */
export const acceptBooking = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const { id } = req.params;
        
        // Find booking
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Assign user to booking using model method
        await (booking as any).assignUser(new mongoose.Types.ObjectId(req.user.userId));
        
        // Update status to confirmed if it was pending
        if (booking.status === 'pending') {
            await (booking as any).updateStatus('confirmed');
        }
        
        return res.status(200).json({
            success: true,
            message: 'Booking accepted successfully',
            data: { booking }
        });
    } catch (error: any) {
        console.error('Accept booking error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error accepting booking',
            error: error.message
        });
    }
};

/**
 * Decline a booking
 * PUT /api/bookings/:id/decline
 */
export const declineBooking = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const { id } = req.params;
        
        // Find booking
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Remove user from booking using model method
        await (booking as any).unassignUser(new mongoose.Types.ObjectId(req.user.userId));
        
        return res.status(200).json({
            success: true,
            message: 'Booking declined successfully',
            data: { booking }
        });
    } catch (error: any) {
        console.error('Decline booking error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error declining booking',
            error: error.message
        });
    }
};

/**
 * Update booking status
 * PUT /api/bookings/:id/status
 */
export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const { id } = req.params;
        const { status } = req.body;
        
        // Validation
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        
        // Find booking
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Check if user is assigned to this booking
        const isAssigned = booking.assignedUsers.some(
            (userId: mongoose.Types.ObjectId) => userId.toString() === req.user!.userId
        );
        
        if (!isAssigned && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this booking'
            });
        }
        
        // Update status using model method
        await (booking as any).updateStatus(status);
        
        return res.status(200).json({
            success: true,
            message: 'Booking status updated successfully',
            data: { booking }
        });
    } catch (error: any) {
        console.error('Update booking status error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error updating booking status',
            error: error.message
        });
    }
};

/**
 * Create a new booking from service page
 * POST /api/bookings
 */
export const createBooking = async (req: Request, res: Response) => {
    try {
        await connectToUserDatabase();
        
        const {
            serviceId,
            serviceName,
            customerName,
            customerPhone,
            customerEmail,
            date,
            timeSlot,
            fromZip,
            toZip,
            rooms,
            notes
        } = req.body;
        
        // Validation
        if (!serviceId || !serviceName || !customerName || !customerPhone || !customerEmail || !date || !timeSlot) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: serviceId, serviceName, customerName, customerPhone, customerEmail, date, timeSlot'
            });
        }
        
        // Create new booking
        const booking = new Booking({
            serviceId,
            serviceName,
            customerName,
            customerPhone,
            customerEmail,
            date: new Date(date),
            timeSlot,
            fromZip,
            toZip,
            rooms,
            notes,
            assignedUsers: [],
            status: 'pending'
        });
        
        await booking.save();
        
        return res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: { booking }
        });
    } catch (error: any) {
        console.error('Create booking error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating booking',
            error: error.message
        });
    }
};

