import mongoose, { Schema, Document } from 'mongoose';

// TimeSlot interface for bookings
export interface IBookingTimeSlot {
    startTime: string; // Format: "09:00"
    endTime: string; // Format: "17:00"
}

// Booking interface
export interface IBooking extends Document {
    _id: mongoose.Types.ObjectId;
    serviceId: string;
    serviceName: string;
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    assignedUsers: mongoose.Types.ObjectId[]; // Array of User IDs
    date: Date;
    timeSlot: IBookingTimeSlot;
    status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
    notes?: string;
    fromZip?: string;
    toZip?: string;
    rooms?: string;
    createdAt: Date;
    updatedAt: Date;
}

// TimeSlot sub-schema
const BookingTimeSlotSchema: Schema=new Schema({
    startTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
    },
    endTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
}, {
    _id: false
});

// Booking schema
const BookingSchema: Schema=new Schema({
    serviceId: {
        type: String,
        required: true,
        index: true
    },
    serviceName: {
        type: String,
        required: true
    },
    customerId: {
        type: String,
        index: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true
    },
    customerEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    assignedUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    date: {
        type: Date,
        required: true,
        index: true
    },
    timeSlot: {
        type: BookingTimeSlotSchema,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    notes: {
        type: String,
        default: ''
    },
    fromZip: {
        type: String,
        trim: true
    },
    toZip: {
        type: String,
        trim: true
    },
    rooms: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
BookingSchema.index({ date: 1, status: 1 });
BookingSchema.index({ serviceId: 1, status: 1 });
BookingSchema.index({ customerId: 1, date: -1 });
BookingSchema.index({ assignedUsers: 1, date: 1 });
BookingSchema.index({ assignedUsers: 1, status: 1 });

// Method to assign user to booking
BookingSchema.methods.assignUser=function(userId: mongoose.Types.ObjectId) {
    if(!this.assignedUsers.includes(userId)){
        this.assignedUsers.push(userId);
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to unassign user from booking
BookingSchema.methods.unassignUser=function(userId: mongoose.Types.ObjectId) {
    const index=this.assignedUsers.findIndex(
        (id: mongoose.Types.ObjectId) => id.toString()===userId.toString()
    );
    
    if(index > -1){
        this.assignedUsers.splice(index, 1);
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to update booking status
BookingSchema.methods.updateStatus=function(newStatus: string) {
    const validStatuses=['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
    if(!validStatuses.includes(newStatus)){
        throw new Error(`Invalid status: ${newStatus}`);
    }
    
    this.status=newStatus;
    return this.save();
};

// Virtual to check if booking has assigned movers
BookingSchema.virtual('hasAssignedMovers').get(function(this: IBooking) {
    return this.assignedUsers.length > 0;
});

// Virtual to check if booking is active
BookingSchema.virtual('isActive').get(function(this: IBooking) {
    return ['pending', 'confirmed', 'in-progress'].includes(this.status);
});

const Booking=mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;

