import { Request, Response } from 'express';
import { User } from '../models/userModel';
import { generateTokenPair, verifyRefreshToken } from '../util/jwt-helper';
import { connectToUserDatabase } from '../database/mongodb-user-connection';

// Extend Express Request to include user
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email?: string;
        role: 'customer' | 'mover' | 'shiftlead' | 'admin' | 'manager' | string;
    };
}

/**
 * Register new user
 * POST /api/auth/register
 */
export const register=async (req: Request, res: Response)=>{
    try {
        // Connect to user database
        await connectToUserDatabase();
        
        const { email, password, role, firstName, lastName, phone }=req.body;
        
        // Validation
        if(!email || !password || !firstName || !lastName || !phone){
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Check if user already exists
        const existingUser=await User.findOne({ email: email.toLowerCase() });
        if(existingUser){
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        
        // Validate role
        const validRoles=['mover', 'shiftlead', 'admin', 'manager'];
        const userRole=role || 'mover';
        if(!validRoles.includes(userRole)){
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }
        
        // Create new user
        const newUser=new User({
            email: email.toLowerCase(),
            password, // Will be hashed by pre-save hook
            role: userRole,
            firstName,
            lastName,
            phone,
            isActive: true
        });
        
        await newUser.save();
        
        // Generate tokens
        const tokens=generateTokenPair({
            userId: String(newUser._id),
            email: newUser.email,
            role: newUser.role
        });
        
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: newUser._id,
                    email: newUser.email,
                    role: newUser.role,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    phone: newUser.phone,
                    status: newUser.isActive ? 'active' : 'inactive'
                },
                ...tokens
            }
        });
    } catch(error: any){
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login=async (req: Request, res: Response)=>{
    try {
        // Connect to user database
        await connectToUserDatabase();
        
        const { email, password }=req.body;
        
        // Validation
        if(!email || !password){
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        // Find user
        const user=await User.findOne({ email: email.toLowerCase() });
        if(!user){
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Check if user is active
        if(!user.isActive){
            return res.status(403).json({
                success: false,
                message: 'Account is inactive. Please contact support.'
            });
        }
        
        // Verify password
        const isPasswordValid=await user.comparePassword(password);
        if(!isPasswordValid){
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Generate tokens
        const tokens=generateTokenPair({
            userId: String(user._id),
            email: user.email,
            role: user.role
        });
        
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    status: user.isActive ? 'active' : 'inactive',
                    profileImage: user.avatar
                },
                ...tokens
            }
        });
    } catch(error: any){
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout=async (_req: Request, res: Response)=>{
    try {
        // In JWT-based auth, logout is handled client-side by removing tokens
        // This endpoint can be used for logging or cleanup if needed
        
        return res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch(error: any){
        console.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error logging out',
            error: error.message
        });
    }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser=async (req: AuthRequest, res: Response)=>{
    try {
        // Connect to user database
        await connectToUserDatabase();
        
        // User info is attached by auth middleware
        if(!req.user){
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        // Fetch full user details
        const user=await User.findById(req.user.userId).select('-password');
        if(!user){
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    status: user.isActive ? 'active' : 'inactive',
                    profileImage: user.avatar,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            }
        });
    } catch(error: any){
        console.error('Get current user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile=async (req: AuthRequest, res: Response)=>{
    try {
        // Connect to user database
        await connectToUserDatabase();
        
        if(!req.user){
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const { firstName, lastName, phone, profileImage }=req.body;
        
        // Find and update user
        const user=await User.findById(req.user.userId);
        if(!user){
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update fields
        if(firstName) user.firstName=firstName;
        if(lastName) user.lastName=lastName;
        if(phone) user.phone=phone;
        if(profileImage) user.avatar=profileImage;
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    status: (user as any).status,
                    profileImage: (user as any).profileImage
                }
            }
        });
    } catch(error: any){
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshAccessToken=async (req: Request, res: Response)=>{
    try {
        const { refreshToken }=req.body;
        
        if(!refreshToken){
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }
        
        // Verify refresh token
        const payload=verifyRefreshToken(refreshToken);
        if(!payload){
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }
        
        // Generate new tokens
        const tokens=generateTokenPair({
            userId: payload.userId,
            email: payload.email,
            role: payload.role
        });
        
        return res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: tokens
        });
    } catch(error: any){
        console.error('Refresh token error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error refreshing token',
            error: error.message
        });
    }
};

