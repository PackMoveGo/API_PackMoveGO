import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  totalWeight?: number;
  totalVolume?: number;
  isExpired?: boolean;
  // Instance methods
  updateStatus(newStatus: string, notes?: string, updatedBy?: mongoose.Types.ObjectId): Promise<IBooking>;
  addMessage(senderId: mongoose.Types.ObjectId, senderType: string, message: string, attachments?: string[]): Promise<IBooking>;
  updateLocation(latitude: number, longitude: number, address?: string): Promise<IBooking>;
  addCheckpoint(location: string, status: string, notes?: string): Promise<IBooking>;
  addAIInteraction(question: string, answer: string, helpful?: boolean): Promise<IBooking>;
  setRating(rating: {
    overall: number;
    communication: number;
    punctuality: number;
    care: number;
    value: number;
    comment?: string;
  }): Promise<IBooking>;
  // Basic booking information
  bookingId: string;
  customerId: mongoose.Types.ObjectId;
  moverId?: mongoose.Types.ObjectId;
  
  // Service details
  serviceType: 'local' | 'long-distance' | 'international' | 'storage' | 'packing';
  moveType: 'residential' | 'commercial' | 'office' | 'apartment';
  
  // Addresses
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    accessNotes?: string;
  };
  
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    accessNotes?: string;
  };
  
  // Move details
  moveDate: Date;
  estimatedDuration: number; // in hours
  distance: number; // in miles
  inventory: {
    item: string;
    quantity: number;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    specialHandling?: boolean;
    fragile?: boolean;
  }[];
  
  // Pricing
  quoteAmount: number;
  finalAmount?: number;
  depositAmount?: number;
  depositPaid?: boolean;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: 'card' | 'cash' | 'bank_transfer';
  
  // Status tracking
  status: 'quote_requested' | 'quote_provided' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  statusHistory: {
    status: string;
    timestamp: Date;
    notes?: string;
    updatedBy?: mongoose.Types.ObjectId;
  }[];
  
  // Real-time tracking
  tracking: {
    currentLocation?: {
      latitude: number;
      longitude: number;
      timestamp: Date;
      address?: string;
    };
    estimatedArrival?: Date;
    actualStartTime?: Date;
    actualEndTime?: Date;
    checkpoints: {
      location: string;
      timestamp: Date;
      status: 'pending' | 'completed' | 'delayed';
      notes?: string;
    }[];
  };
  
  // Communication
  messages: {
    senderId: mongoose.Types.ObjectId;
    senderType: 'customer' | 'mover' | 'system';
    message: string;
    timestamp: Date;
    isRead: boolean;
    attachments?: string[];
  }[];
  
  // AI Assistant interactions
  aiInteractions: {
    question: string;
    answer: string;
    timestamp: Date;
    helpful: boolean;
  }[];
  
  // Customer feedback
  rating?: {
    overall: number;
    communication: number;
    punctuality: number;
    care: number;
    value: number;
    comment?: string;
    timestamp: Date;
  };
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const bookingSchema = new Schema<IBooking>({
  // Basic booking information
  bookingId: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Service details
  serviceType: {
    type: String,
    enum: ['local', 'long-distance', 'international', 'storage', 'packing'],
    required: true
  },
  moveType: {
    type: String,
    enum: ['residential', 'commercial', 'office', 'apartment'],
    required: true
  },
  
  // Addresses
  pickupAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'US' },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    },
    accessNotes: { type: String, default: '' }
  },
  
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'US' },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    },
    accessNotes: { type: String, default: '' }
  },
  
  // Move details
  moveDate: {
    type: Date,
    required: true
  },
  estimatedDuration: {
    type: Number,
    required: true,
    min: 1
  },
  distance: {
    type: Number,
    default: 0
  },
  inventory: [{
    item: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    weight: { type: Number, default: null },
    dimensions: {
      length: { type: Number, default: null },
      width: { type: Number, default: null },
      height: { type: Number, default: null }
    },
    specialHandling: { type: Boolean, default: false },
    fragile: { type: Boolean, default: false }
  }],
  
  // Pricing
  quoteAmount: {
    type: Number,
    required: true,
    min: 0
  },
  finalAmount: {
    type: Number,
    default: null,
    min: 0
  },
  depositAmount: {
    type: Number,
    default: null,
    min: 0
  },
  depositPaid: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'bank_transfer'],
    default: null
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['quote_requested', 'quote_provided', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'quote_requested'
  },
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  }],
  
  // Real-time tracking
  tracking: {
    currentLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      timestamp: { type: Date, default: null },
      address: { type: String, default: '' }
    },
    estimatedArrival: { type: Date, default: null },
    actualStartTime: { type: Date, default: null },
    actualEndTime: { type: Date, default: null },
    checkpoints: [{
      location: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      status: {
        type: String,
        enum: ['pending', 'completed', 'delayed'],
        default: 'pending'
      },
      notes: { type: String, default: '' }
    }]
  },
  
  // Communication
  messages: [{
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderType: {
      type: String,
      enum: ['customer', 'mover', 'system'],
      required: true
    },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
    attachments: [{ type: String }]
  }],
  
  // AI Assistant interactions
  aiInteractions: [{
    question: { type: String, required: true },
    answer: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    helpful: { type: Boolean, default: true }
  }],
  
  // Customer feedback
  rating: {
    overall: { type: Number, min: 1, max: 5, default: null },
    communication: { type: Number, min: 1, max: 5, default: null },
    punctuality: { type: Number, min: 1, max: 5, default: null },
    care: { type: Number, min: 1, max: 5, default: null },
    value: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: '' },
    timestamp: { type: Date, default: null }
  },
  
  // System fields
  expiresAt: {
    type: Date,
    default: function() {
      // Quote expires in 24 hours by default
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Calculate total weight and volume
      if (ret.inventory) {
        ret.totalWeight = ret.inventory.reduce((sum: number, item: any) => {
          return sum + (item.weight * item.quantity || 0);
        }, 0);
        
        ret.totalVolume = ret.inventory.reduce((sum: number, item: any) => {
          if (item.dimensions) {
            const volume = item.dimensions.length * item.dimensions.width * item.dimensions.height;
            return sum + (volume * item.quantity || 0);
          }
          return sum;
        }, 0);
      }
      
      return ret;
    }
  }
});

// Indexes for better query performance
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ customerId: 1 });
bookingSchema.index({ moverId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ moveDate: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ 'tracking.currentLocation': '2dsphere' });
bookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for total weight
bookingSchema.virtual('totalWeight').get(function(this: IBooking) {
  return this.inventory.reduce((sum, item) => {
    return sum + ((item.weight || 0) * item.quantity);
  }, 0);
});

// Virtual for total volume
bookingSchema.virtual('totalVolume').get(function(this: IBooking) {
  return this.inventory.reduce((sum, item) => {
    if (item.dimensions) {
      const volume = item.dimensions.length * item.dimensions.width * item.dimensions.height;
      return sum + (volume * item.quantity);
    }
    return sum;
  }, 0);
});

// Virtual for is expired
bookingSchema.virtual('isExpired').get(function(this: IBooking) {
  return this.expiresAt ? new Date() > this.expiresAt : false;
});

// Pre-save middleware
bookingSchema.pre('save', function(next) {
  // Generate booking ID if not exists
  if (!this.bookingId) {
    this.bookingId = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  
  // Add to status history if status changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  
  next();
});

// Static methods
bookingSchema.statics.findByBookingId = function(bookingId: string) {
  return this.findOne({ bookingId });
};

bookingSchema.statics.findByCustomer = function(customerId: string) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

bookingSchema.statics.findByMover = function(moverId: string) {
  return this.find({ moverId }).sort({ moveDate: 1 });
};

bookingSchema.statics.findActiveBookings = function() {
  return this.find({
    status: { $in: ['confirmed', 'in_progress'] }
  }).sort({ moveDate: 1 });
};

bookingSchema.statics.findExpiredQuotes = function() {
  return this.find({
    status: 'quote_requested',
    expiresAt: { $lt: new Date() }
  });
};

// Instance methods
bookingSchema.methods.updateStatus = function(newStatus: string, notes?: string, updatedBy?: mongoose.Types.ObjectId) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    notes: notes || '',
    updatedBy: updatedBy || null
  });
  return this.save();
};

bookingSchema.methods.addMessage = function(senderId: mongoose.Types.ObjectId, senderType: string, message: string, attachments?: string[]) {
  this.messages.push({
    senderId,
    senderType: senderType as 'customer' | 'mover' | 'system',
    message,
    timestamp: new Date(),
    isRead: false,
    attachments: attachments || []
  });
  return this.save();
};

bookingSchema.methods.updateLocation = function(latitude: number, longitude: number, address?: string) {
  this.tracking.currentLocation = {
    latitude,
    longitude,
    timestamp: new Date(),
    address: address || ''
  };
  return this.save();
};

bookingSchema.methods.addCheckpoint = function(location: string, status: string, notes?: string) {
  this.tracking.checkpoints.push({
    location,
    timestamp: new Date(),
    status: status as 'pending' | 'completed' | 'delayed',
    notes: notes || ''
  });
  return this.save();
};

bookingSchema.methods.addAIInteraction = function(question: string, answer: string, helpful: boolean = true) {
  this.aiInteractions.push({
    question,
    answer,
    timestamp: new Date(),
    helpful
  });
  return this.save();
};

bookingSchema.methods.setRating = function(rating: {
  overall: number;
  communication: number;
  punctuality: number;
  care: number;
  value: number;
  comment?: string;
}) {
  this.rating = {
    ...rating,
    timestamp: new Date()
  };
  return this.save();
};

// Interface for the model with static methods
interface IBookingModel extends mongoose.Model<IBooking> {
  findByBookingId(bookingId: string): Promise<IBooking | null>;
  findByCustomer(customerId: string): Promise<IBooking[]>;
  findByMover(moverId: string): Promise<IBooking[]>;
  findActiveBookings(): Promise<IBooking[]>;
  findExpiredQuotes(): Promise<IBooking[]>;
}

// Export the model
export const Booking = mongoose.model<IBooking, IBookingModel>('Booking', bookingSchema);

export default Booking; 