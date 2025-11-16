import mongoose, { Schema, Document } from 'mongoose';

// Review interface
export interface IReview extends Document {
    _id: mongoose.Types.ObjectId;
    serviceId: string;
    serviceName: string;
    userId?: string; // Optional - anonymous reviews allowed
    userName: string;
    userEmail?: string;
    rating: number; // 1-5
    title: string;
    comment: string;
    isPublic: boolean; // Public or private review
    isApproved: boolean; // Moderation flag
    isVerified: boolean; // Verified customer flag
    createdAt: Date;
    updatedAt: Date;
}

// Review schema
const ReviewSchema: Schema=new Schema({
    serviceId: {
        type: String,
        required: true,
        index: true
    },
    serviceName: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        index: true
    },
    userName: {
        type: String,
        required: true,
        trim: true
    },
    userEmail: {
        type: String,
        lowercase: true,
        trim: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    isApproved: {
        type: Boolean,
        default: false // Requires moderation
    },
    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
ReviewSchema.index({ serviceId: 1, isPublic: 1, isApproved: 1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1, createdAt: -1 });

// Virtual for average rating
ReviewSchema.static('getAverageRating', async function(serviceId: string) {
    const result = await this.aggregate([
        {
            $match: {
                serviceId,
                isPublic: true,
                isApproved: true
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);
    
    if (result.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
    }
    
    return {
        averageRating: Math.round(result[0].averageRating * 10) / 10,
        totalReviews: result[0].totalReviews
    };
});

const Review=mongoose.model<IReview>('Review', ReviewSchema);

export default Review;

