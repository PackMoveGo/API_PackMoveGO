import mongoose, { Schema, Document } from 'mongoose';

// TimeSlot interface
export interface ITimeSlot {
    startTime: string; // Format: "09:00"
    endTime: string; // Format: "17:00"
    isBooked: boolean;
    bookingId?: mongoose.Types.ObjectId;
}

// Availability interface
export interface IAvailability extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    date: Date; // Date without time
    timeSlots: ITimeSlot[];
    status: 'available' | 'booked' | 'unavailable';
    createdAt: Date;
    updatedAt: Date;
}

// TimeSlot sub-schema
const TimeSlotSchema: Schema=new Schema({
    startTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
    },
    endTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    isBooked: {
        type: Boolean,
        default: false
    },
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    }
}, {
    _id: false // Don't create _id for sub-documents
});

// Availability schema
const AvailabilitySchema: Schema=new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    timeSlots: {
        type: [TimeSlotSchema],
        required: true,
        validate: {
            validator: function(slots: ITimeSlot[]) {
                return slots.length > 0;
            },
            message: 'At least one time slot is required'
        }
    },
    status: {
        type: String,
        enum: ['available', 'booked', 'unavailable'],
        default: 'available'
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
AvailabilitySchema.index({ userId: 1, date: 1 });
AvailabilitySchema.index({ date: 1, status: 1 });
AvailabilitySchema.index({ userId: 1, status: 1 });

// Virtual to check if any slots are available
AvailabilitySchema.virtual('hasAvailableSlots').get(function(this: IAvailability) {
    return this.timeSlots.some(slot => !slot.isBooked);
});

// Method to book a time slot
AvailabilitySchema.methods.bookSlot=function(slotIndex: number, bookingId: mongoose.Types.ObjectId) {
    if(slotIndex < 0 || slotIndex >= this.timeSlots.length){
        throw new Error('Invalid slot index');
    }
    
    const slot=this.timeSlots[slotIndex];
    if(slot.isBooked){
        throw new Error('Time slot is already booked');
    }
    
    slot.isBooked=true;
    slot.bookingId=bookingId;
    
    // Update overall status if all slots are booked
    const allBooked=this.timeSlots.every((s: ITimeSlot) => s.isBooked);
    if(allBooked){
        this.status='booked';
    }
    
    return this.save();
};

// Method to release a time slot
AvailabilitySchema.methods.releaseSlot=function(slotIndex: number) {
    if(slotIndex < 0 || slotIndex >= this.timeSlots.length){
        throw new Error('Invalid slot index');
    }
    
    const slot=this.timeSlots[slotIndex];
    slot.isBooked=false;
    slot.bookingId=undefined;
    
    // Update status to available if any slot is now free
    this.status='available';
    
    return this.save();
};

const Availability=mongoose.model<IAvailability>('Availability', AvailabilitySchema);

export default Availability;

