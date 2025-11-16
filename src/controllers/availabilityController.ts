import { Request, Response } from 'express';
import Availability from '../models/Availability';
import { connectToUserDatabase } from '../database/mongodb-user-connection';
import { AuthRequest } from '../controllers/userAuthController';
import mongoose from 'mongoose';

/**
 * Get availability for a specific user
 * GET /api/availability/:userId
 */
export const getUserAvailability = async (req: Request, res: Response) => {
    try {
        await connectToUserDatabase();
        
        const { userId } = req.params;
        const { startDate, endDate } = req.query;
        
        // Build query
        const query: any = { userId: new mongoose.Types.ObjectId(userId) };
        
        // Add date range if provided
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }
        
        const availability = await Availability.find(query).sort({ date: 1 });
        
        return res.status(200).json({
            success: true,
            data: {
                availability,
                count: availability.length
            }
        });
    } catch (error: any) {
        console.error('Get user availability error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching availability',
            error: error.message
        });
    }
};

/**
 * Create availability slot
 * POST /api/availability
 */
export const createAvailability = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const { date, timeSlots } = req.body;
        
        // Validation
        if (!date || !timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Date and time slots are required'
            });
        }
        
        // Check if availability already exists for this date
        const existingAvailability = await Availability.findOne({
            userId: new mongoose.Types.ObjectId(req.user.userId),
            date: new Date(date)
        });
        
        if (existingAvailability) {
            return res.status(400).json({
                success: false,
                message: 'Availability already exists for this date. Use update endpoint instead.'
            });
        }
        
        // Create new availability
        const availability = new Availability({
            userId: new mongoose.Types.ObjectId(req.user.userId),
            date: new Date(date),
            timeSlots,
            status: 'available'
        });
        
        await availability.save();
        
        return res.status(201).json({
            success: true,
            message: 'Availability created successfully',
            data: { availability }
        });
    } catch (error: any) {
        console.error('Create availability error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating availability',
            error: error.message
        });
    }
};

/**
 * Update availability
 * PUT /api/availability/:id
 */
export const updateAvailability = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const { id } = req.params;
        const { timeSlots, status } = req.body;
        
        // Find availability
        const availability = await Availability.findById(id);
        if (!availability) {
            return res.status(404).json({
                success: false,
                message: 'Availability not found'
            });
        }
        
        // Check ownership
        if (availability.userId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this availability'
            });
        }
        
        // Update fields
        if (timeSlots) availability.timeSlots = timeSlots;
        if (status) availability.status = status;
        
        await availability.save();
        
        return res.status(200).json({
            success: true,
            message: 'Availability updated successfully',
            data: { availability }
        });
    } catch (error: any) {
        console.error('Update availability error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating availability',
            error: error.message
        });
    }
};

/**
 * Delete availability
 * DELETE /api/availability/:id
 */
export const deleteAvailability = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const { id } = req.params;
        
        // Find availability
        const availability = await Availability.findById(id);
        if (!availability) {
            return res.status(404).json({
                success: false,
                message: 'Availability not found'
            });
        }
        
        // Check ownership
        if (availability.userId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this availability'
            });
        }
        
        await Availability.findByIdAndDelete(id);
        
        return res.status(200).json({
            success: true,
            message: 'Availability deleted successfully'
        });
    } catch (error: any) {
        console.error('Delete availability error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting availability',
            error: error.message
        });
    }
};

/**
 * Get available movers/shift leads for a specific date
 * GET /api/availability/available/:date
 */
export const getAvailableUsers = async (req: Request, res: Response) => {
    try {
        await connectToUserDatabase();
        
        const { date } = req.params;
        const { role } = req.query; // Optional filter by role
        
        // Find all available slots for this date
        if (!date) {
            res.status(400).json({ success: false, message: 'Date parameter is required' });
            return;
        }
        const query: any = {
            date: new Date(date),
            status: { $in: ['available', 'booked'] },
            $expr: {
                $gt: [
                    {
                        $size: {
                            $filter: {
                                input: '$timeSlots',
                                cond: { $eq: ['$$this.isBooked', false] }
                            }
                        }
                    },
                    0
                ]
            }
        };
        
        const availability = await Availability.find(query).populate('userId', 'firstName lastName email role');
        
        // Filter by role if specified
        let filteredAvailability = availability;
        if (role) {
            filteredAvailability = availability.filter((avail: any) => 
                avail.userId && avail.userId.role === role
            );
        }
        
        return res.status(200).json({
            success: true,
            data: {
                availability: filteredAvailability,
                count: filteredAvailability.length,
                date
            }
        });
    } catch (error: any) {
        console.error('Get available users error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching available users',
            error: error.message
        });
    }
};

/**
 * Book a time slot
 * POST /api/availability/:id/book
 */
export const bookTimeSlot = async (req: Request, res: Response) => {
    try {
        await connectToUserDatabase();
        
        const { id } = req.params;
        const { slotIndex, bookingId } = req.body;
        
        // Validation
        if (slotIndex === undefined || !bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Slot index and booking ID are required'
            });
        }
        
        // Find availability
        const availability = await Availability.findById(id);
        if (!availability) {
            return res.status(404).json({
                success: false,
                message: 'Availability not found'
            });
        }
        
        // Book the slot using model method
        await (availability as any).bookSlot(slotIndex, new mongoose.Types.ObjectId(bookingId));
        
        return res.status(200).json({
            success: true,
            message: 'Time slot booked successfully',
            data: { availability }
        });
    } catch (error: any) {
        console.error('Book time slot error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error booking time slot',
            error: error.message
        });
    }
};

/**
 * Release a time slot
 * POST /api/availability/:id/release
 */
export const releaseTimeSlot = async (req: Request, res: Response) => {
    try {
        await connectToUserDatabase();
        
        const { id } = req.params;
        const { slotIndex } = req.body;
        
        // Validation
        if (slotIndex === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Slot index is required'
            });
        }
        
        // Find availability
        const availability = await Availability.findById(id);
        if (!availability) {
            return res.status(404).json({
                success: false,
                message: 'Availability not found'
            });
        }
        
        // Release the slot using model method
        await (availability as any).releaseSlot(slotIndex);
        
        return res.status(200).json({
            success: true,
            message: 'Time slot released successfully',
            data: { availability }
        });
    } catch (error: any) {
        console.error('Release time slot error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error releasing time slot',
            error: error.message
        });
    }
};

