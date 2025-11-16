import { Request, Response } from 'express';
import Review from '../models/Review';
import { connectToUserDatabase } from '../database/mongodb-user-connection';
import { AuthRequest } from '../controllers/userAuthController';

/**
 * Get reviews for a specific service
 * GET /api/reviews/service/:serviceId
 */
export const getServiceReviews = async (req: Request, res: Response) => {
    try {
        await connectToUserDatabase();
        
        const { serviceId } = req.params;
        const { includePrivate } = req.query;
        
        // Build query - only show approved public reviews by default
        const query: any = {
            serviceId,
            isApproved: true
        };
        
        // Only include private reviews if explicitly requested (for admin)
        if (!includePrivate) {
            query.isPublic = true;
        }
        
        const reviews = await Review.find(query).sort({ createdAt: -1 });
        
        // Get average rating
        const stats = await (Review as any).getAverageRating(serviceId);
        
        return res.status(200).json({
            success: true,
            data: {
                reviews,
                stats: {
                    averageRating: stats.averageRating,
                    totalReviews: stats.totalReviews
                },
                count: reviews.length
            }
        });
    } catch (error: any) {
        console.error('Get service reviews error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    }
};

/**
 * Create a new review
 * POST /api/reviews
 */
export const createReview = async (req: Request, res: Response) => {
    try {
        await connectToUserDatabase();
        
        const {
            serviceId,
            serviceName,
            userId,
            userName,
            userEmail,
            rating,
            title,
            comment,
            isPublic
        } = req.body;
        
        // Validation
        if (!serviceId || !serviceName || !userName || !rating || !title || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: serviceId, serviceName, userName, rating, title, comment'
            });
        }
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }
        
        // Create new review
        const review = new Review({
            serviceId,
            serviceName,
            userId,
            userName,
            userEmail,
            rating,
            title,
            comment,
            isPublic: isPublic !== false, // Default to public
            isApproved: false, // Requires moderation
            isVerified: false
        });
        
        await review.save();
        
        return res.status(201).json({
            success: true,
            message: 'Review submitted successfully. It will be published after moderation.',
            data: { review }
        });
    } catch (error: any) {
        console.error('Create review error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating review',
            error: error.message
        });
    }
};

/**
 * Update a review
 * PUT /api/reviews/:id
 */
export const updateReview = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const { id } = req.params;
        const { title, comment, rating, isPublic } = req.body;
        
        // Find review
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        // Check ownership
        if (review.userId && review.userId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this review'
            });
        }
        
        // Update fields
        if (title) review.title = title;
        if (comment) review.comment = comment;
        if (rating) review.rating = rating;
        if (isPublic !== undefined) review.isPublic = isPublic;
        
        // Reset approval on edit
        review.isApproved = false;
        
        await review.save();
        
        return res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: { review }
        });
    } catch (error: any) {
        console.error('Update review error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating review',
            error: error.message
        });
    }
};

/**
 * Delete a review
 * DELETE /api/reviews/:id
 */
export const deleteReview = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const { id } = req.params;
        
        // Find review
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        // Check ownership
        if (review.userId && review.userId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this review'
            });
        }
        
        await Review.findByIdAndDelete(id);
        
        return res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error: any) {
        console.error('Delete review error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting review',
            error: error.message
        });
    }
};

/**
 * Approve a review (admin only)
 * PUT /api/reviews/:id/approve
 */
export const approveReview = async (req: AuthRequest, res: Response) => {
    try {
        await connectToUserDatabase();
        
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        
        const { id } = req.params;
        
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        review.isApproved = true;
        await review.save();
        
        return res.status(200).json({
            success: true,
            message: 'Review approved successfully',
            data: { review }
        });
    } catch (error: any) {
        console.error('Approve review error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error approving review',
            error: error.message
        });
    }
};
