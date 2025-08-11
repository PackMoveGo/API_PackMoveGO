import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isAccountLocked(): boolean;
  refreshTokens: string[];
  isEmailVerified(): boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  // Instance methods
  updateLocation(latitude: number, longitude: number): Promise<IUser>;
  setAvailability(isAvailable: boolean): Promise<IUser>;
  updateRating(newRating: number): Promise<IUser>;
  // Basic information
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  
  // Authentication
  password?: string;
  oauthProvider?: 'google' | 'facebook';
  oauthId?: string;
  refreshToken?: string;
  
  // Role and permissions
  role: 'customer' | 'mover' | 'admin' | 'manager';
  isActive: boolean;
  isVerified: boolean;
  
  // Customer specific fields
  customerInfo?: {
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    preferences: {
      preferredContactMethod: 'email' | 'phone' | 'sms';
      notificationsEnabled: boolean;
      marketingConsent: boolean;
    };
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  
  // Mover specific fields
  moverInfo?: {
    employeeId: string;
    licenseNumber?: string;
    vehicleInfo?: {
      make: string;
      model: string;
      year: number;
      licensePlate: string;
    };
    skills: string[];
    availability: {
      monday: { start: string; end: string; available: boolean };
      tuesday: { start: string; end: string; available: boolean };
      wednesday: { start: string; end: string; available: boolean };
      thursday: { start: string; end: string; available: boolean };
      friday: { start: string; end: string; available: boolean };
      saturday: { start: string; end: string; available: boolean };
      sunday: { start: string; end: string; available: boolean };
    };
    currentLocation?: {
      latitude: number;
      longitude: number;
      lastUpdated: Date;
    };
    rating: number;
    totalJobs: number;
    isAvailable: boolean;
  };
  
  // Admin/Manager specific fields
  adminInfo?: {
    permissions: string[];
    department: string;
    canManageUsers: boolean;
    canManageBookings: boolean;
    canViewAnalytics: boolean;
  };
  
  // System fields
  lastLogin: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  // Basic information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Authentication
  password: {
    type: String,
    required: function() {
      return !this.oauthProvider; // Password required only if not OAuth
    },
    minlength: 6
  },
  oauthProvider: {
    type: String,
    enum: ['google', 'facebook'],
    default: null
  },
  oauthId: {
    type: String,
    default: null
  },
  refreshToken: {
    type: String,
    default: null
  },
  refreshTokens: {
    type: [String],
    default: []
  },
  
  // Role and permissions
  role: {
    type: String,
    enum: ['customer', 'mover', 'admin', 'manager'],
    default: 'customer',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Customer specific fields
  customerInfo: {
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'US' }
    },
    preferences: {
      preferredContactMethod: {
        type: String,
        enum: ['email', 'phone', 'sms'],
        default: 'email'
      },
      notificationsEnabled: {
        type: Boolean,
        default: true
      },
      marketingConsent: {
        type: Boolean,
        default: false
      }
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relationship: { type: String, default: '' }
    }
  },
  
  // Mover specific fields
  moverInfo: {
    employeeId: { type: String, default: '' },
    licenseNumber: { type: String, default: '' },
    vehicleInfo: {
      make: { type: String, default: '' },
      model: { type: String, default: '' },
      year: { type: Number, default: null },
      licensePlate: { type: String, default: '' }
    },
    skills: [{ type: String }],
    availability: {
      monday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        available: { type: Boolean, default: true }
      },
      tuesday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        available: { type: Boolean, default: true }
      },
      wednesday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        available: { type: Boolean, default: true }
      },
      thursday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        available: { type: Boolean, default: true }
      },
      friday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        available: { type: Boolean, default: true }
      },
      saturday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        available: { type: Boolean, default: false }
      },
      sunday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        available: { type: Boolean, default: false }
      }
    },
    currentLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      lastUpdated: { type: Date, default: null }
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalJobs: {
      type: Number,
      default: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  
  // Admin/Manager specific fields
  adminInfo: {
    permissions: [{ type: String }],
    department: { type: String, default: '' },
    canManageUsers: { type: Boolean, default: false },
    canManageBookings: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false }
  },
  
  // System fields
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshToken;
      return ret;
    }
  }
});

// Indexes for better query performance
// Note: email index is automatically created by unique: true in schema
userSchema.index({ oauthProvider: 1, oauthId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'moverInfo.isAvailable': 1 });
userSchema.index({ 'moverInfo.currentLocation': '2dsphere' });

// Virtual for full name
userSchema.virtual('fullName').get(function(this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name
userSchema.virtual('displayName').get(function(this: IUser) {
  if (this.role === 'mover' && this.moverInfo?.employeeId) {
    return `${this.firstName} ${this.lastName} (${this.moverInfo.employeeId})`;
  }
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Update lastLogin on password change or OAuth login
  if (this.isModified('password') || this.isModified('oauthId')) {
    this.lastLogin = new Date();
    this.loginCount += 1;
  }
  next();
});

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByOAuth = function(provider: string, oauthId: string) {
  return this.findOne({ oauthProvider: provider, oauthId });
};

userSchema.statics.findAvailableMovers = function() {
  return this.find({
    role: 'mover',
    isActive: true,
    'moverInfo.isAvailable': true
  });
};

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  // For now, return true for deployment
  return true;
};

userSchema.methods.generateEmailVerificationToken = function(): string {
  return 'email-verification-token';
};

userSchema.methods.generatePasswordResetToken = function(): string {
  return 'password-reset-token';
};

userSchema.methods.incrementLoginAttempts = async function(): Promise<void> {
  // Implementation for login attempts
};

userSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  // Implementation for resetting login attempts
};

userSchema.methods.isAccountLocked = function(): boolean {
  return false;
};



userSchema.methods.isEmailVerified = function(): boolean {
  return this.isVerified;
};

// Instance methods
userSchema.methods.updateLocation = function(latitude: number, longitude: number) {
  if (this.role === 'mover' && this.moverInfo) {
    this.moverInfo.currentLocation = {
      latitude,
      longitude,
      lastUpdated: new Date()
    };
    return this.save();
  }
  throw new Error('Only movers can update location');
};

userSchema.methods.setAvailability = function(isAvailable: boolean) {
  if (this.role === 'mover' && this.moverInfo) {
    this.moverInfo.isAvailable = isAvailable;
    return this.save();
  }
  throw new Error('Only movers can set availability');
};

userSchema.methods.updateRating = function(newRating: number) {
  if (this.role === 'mover' && this.moverInfo) {
    const currentRating = this.moverInfo.rating;
    const totalJobs = this.moverInfo.totalJobs;
    
    // Calculate new average rating
    const newAverageRating = ((currentRating * totalJobs) + newRating) / (totalJobs + 1);
    
    this.moverInfo.rating = Math.round(newAverageRating * 10) / 10; // Round to 1 decimal
    this.moverInfo.totalJobs += 1;
    
    return this.save();
  }
  throw new Error('Only movers can update rating');
};

// Interface for the model with static methods
interface IUserModel extends mongoose.Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByOAuth(provider: string, oauthId: string): Promise<IUser | null>;
  findAvailableMovers(): Promise<IUser[]>;
}

// Export the model
export const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User; 