import {Request,Response,NextFunction} from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel';
import {twilioService} from '../service/twilioService';
import {emailService} from '../service/emailService';
import JWTUtils from '../util/jwt-utils';
import {config} from '../../config/env';

const JWT_SECRET=process.env['JWT_SECRET'] || '';
const JWT_EXPIRE_IN=process.env['JWT_EXPIRES_IN'] || '24h';
const VERIFICATION_CODE_EXPIRY=10*60*1000; // 10 minutes

// In-memory storage for users when MongoDB is unavailable
const inMemoryUsers = new Map<string, any>();

// Helper function to check if MongoDB is available
function isMongoAvailable(): boolean {
  return mongoose.connection.readyState === 1; // 1 = connected
}

export const signUp=async (_req:Request,res:Response,next:NextFunction):Promise<void>=>{
    const session=await mongoose.startSession();
    session.startTransaction();
    try{
        const {name,email,password,location}=_req.body;
        // Check if user already exists
        const existingUser=await (User as any).findOne({email});
        if(existingUser){
            const error=new Error('User already exists') as any;
            error.statusCode=409;
            throw error;
        }
        // Hash password
        const salt=await bcrypt.genSalt(10);
        const hashedPassword=await bcrypt.hash(password,salt);
        
        // Prepare user data with location if provided
        const userData: any={name,email,password:hashedPassword};
        
        // Log location data for service area tracking
        if(location){
          console.log('📍 User signup location:', {
            city: location.city,
            state: location.state,
            country: location.country,
            coordinates: location.latitude && location.longitude ? `${location.latitude},${location.longitude}` : 'N/A'
          });
          
          userData.customerInfo={
            lastKnownLocation:{
              latitude: location.latitude,
              longitude: location.longitude,
              city: location.city,
              state: location.state,
              country: location.country,
              lastUpdated: new Date()
            }
          };
        }
        
        const newUsers=await (User as any).create([userData],{session});
        const token=jwt.sign({userId:newUsers[0]._id},JWT_SECRET,{expiresIn:JWT_EXPIRE_IN} as any);
        await session.commitTransaction();
        session.endSession();
        res.status(201).json({
            success:true,
            message:'User created successfully',
            data:{
                token,
                user:newUsers[0],
            }
        });
    }catch(error){
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
}

export const signIn=async (_req:Request,res:Response,next:NextFunction):Promise<void>=>{
    try{
        const {email,password,location}=_req.body;
        
        // Validate input
        if(!email || !password){
            const error=new Error('Email and password are required') as any;
            error.statusCode=400;
            throw error;
        }
        
        // Find user by email (case-insensitive)
        const user=await (User as any).findOne({email: email.toLowerCase().trim()});
        if(!user){
            const error=new Error('Invalid email or password') as any;
            error.statusCode=401;
            throw error;
        }
        
        // Check if user has a password (OAuth users might not have passwords)
        if(!user.password){
            const error=new Error('Invalid email or password') as any;
            error.statusCode=401;
            throw error;
        }
        
        // Compare password using bcrypt
        const isPasswordCorrect=await bcrypt.compare(password,user.password);
        if(!isPasswordCorrect){
            const error=new Error('Invalid email or password') as any;
            error.statusCode=401;
            throw error;
        }
        
        // Check if account is active
        if(!user.isActive){
            const error=new Error('Account is inactive. Please contact support.') as any;
            error.statusCode=403;
            throw error;
        }
        
        // Update last login
        user.lastLogin=new Date();
        user.loginCount=(user.loginCount || 0)+1;
        
        // Log and update location data for service area tracking
        if(location){
          console.log('📍 User login location:', {
            email: user.email,
            city: location.city,
            state: location.state,
            country: location.country,
            coordinates: location.latitude && location.longitude ? `${location.latitude},${location.longitude}` : 'N/A'
          });
          
          // Update customer location if role is customer
          if(user.role==='customer'){
            if(!user.customerInfo){
              user.customerInfo={
                address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
                preferences: { preferredContactMethod: 'email', notificationsEnabled: true, marketingConsent: false }
              } as any;
            }
            user.customerInfo.lastKnownLocation={
              latitude: location.latitude,
              longitude: location.longitude,
              city: location.city,
              state: location.state,
              country: location.country,
              lastUpdated: new Date()
            };
          }
        }
        
        await user.save();
        
        // Generate JWT token
        const token=jwt.sign(
            {
                userId:user._id,
                email:user.email,
                role:user.role
            },
            JWT_SECRET,
            {expiresIn:JWT_EXPIRE_IN} as any
        );
        
        // Determine redirect URL based on user role
        let redirectUrl=config.DASHBOARD_URL;
        switch(user.role){
            case 'customer':
                redirectUrl=config.CUSTOMER_DASHBOARD_URL || 'http://localhost:5002';
                break;
            case 'admin':
            case 'manager':
                redirectUrl=config.ADMIN_DASHBOARD_URL || 'http://localhost:5004';
                break;
            case 'mover':
                redirectUrl=config.MOVER_DASHBOARD_URL || 'http://localhost:5006';
                break;
            default:
                redirectUrl=config.CUSTOMER_DASHBOARD_URL || 'http://localhost:5002';
        }
        
        // Ensure localhost URLs use http (not https) in development
        if(config.isDevelopment && redirectUrl.includes('localhost')){
            redirectUrl=redirectUrl.replace('https://', 'http://');
        }
        
        // Return user data without password
        const userData=user.toJSON();
        delete userData.password;
        delete userData.refreshToken;
        
        // Calculate token expiration in milliseconds (JWT_EXPIRE_IN is '24h')
        const expiresInHours=24; // Default 24 hours
        const expiresInMs=expiresInHours * 60 * 60 * 1000;
        
        res.status(200).json({
            success:true,
            message:'User signed in successfully',
            data:{
                token,
                user:userData,
                redirectUrl,
                expiresIn:expiresInMs // Include expiration in milliseconds
            }
        });
    }catch(error){
        next(error);
    }
}

export const signOut=async (_req:Request,res:Response,next:NextFunction)=>{
    // Implement sign out logic here
    try{
        res.status(200).json({
            success:true,
            message:'User signed out successfully'
        });
    }catch(error){
        next(error);
    }
}

/**
 * Request SMS signin - sends verification code to phone
 */
import verificationSessionManager from '../util/verification-session';

export const requestSmsSignin=async (_req:Request,res:Response,next:NextFunction):Promise<void>=>{
    try{
        const {phone,username}=_req.body;
        
        // Validate input
        if(!phone){
            const error=new Error('Phone number is required') as any;
            error.statusCode=400;
            throw error;
        }
        
        // Strip all non-digit characters
        const digitsOnly=phone.replace(/\D/g,'');
        
        // Validate exactly 10 digits
        if(digitsOnly.length!==10){
            const error=new Error('Phone number must be exactly 10 digits') as any;
            error.statusCode=400;
            throw error;
        }
        
        // Format as +1XXXXXXXXXX for storage
        const normalizedPhone='+1'+digitsOnly;
        
        // Find or create user (with MongoDB fallback)
        let user: any;
        let userFromMemory=false;
        
        try{
            if(isMongoAvailable()){
                user=await User.findByPhone(normalizedPhone);
            }
        }catch(err){
            console.warn('⚠️ MongoDB query failed, using in-memory storage:', err);
        }
        
        // Fallback to in-memory storage
        if(!user){
            user=inMemoryUsers.get(normalizedPhone);
            if(user) userFromMemory=true;
        }
        
        if(!user && username){
            // Create new user in memory
            user={
                phone:normalizedPhone,
                username,
                role:'customer',
                isVerified:false,
                phoneVerified:false,
                _id:`mem_${Date.now()}`
            };
            userFromMemory=true;
        }else if(!user){
            const error=new Error('User not found. Please provide a username to create an account.') as any;
            error.statusCode=404;
            throw error;
        }
        
        // Generate verification code
        const verificationCode=twilioService.generateVerificationCode();
        user.verificationCode=verificationCode;
        user.verificationCodeExpiry=new Date(Date.now()+VERIFICATION_CODE_EXPIRY);
        
        // Save user
        if(userFromMemory){
            inMemoryUsers.set(normalizedPhone, user);
            console.log('💾 [IN-MEMORY] User stored:', normalizedPhone);
        }else{
            try{
                await user.save();
                console.log('💾 [MONGODB] User saved:', normalizedPhone);
            }catch(saveErr){
                console.warn('⚠️ MongoDB save failed, using in-memory storage:', saveErr);
                inMemoryUsers.set(normalizedPhone, {
                    phone:user.phone,
                    username:user.username,
                    verificationCode:user.verificationCode,
                    verificationCodeExpiry:user.verificationCodeExpiry,
                    role:user.role || 'customer',
                    isVerified:false,
                    phoneVerified:false,
                    _id:user._id || `mem_${Date.now()}`
                });
                userFromMemory=true;
            }
        }
        
        // Send SMS
        const smsSent=await twilioService.sendVerificationCode({
            phone:normalizedPhone,
            code:verificationCode
        });
        
        if(!smsSent){
            console.warn('⚠️ SMS failed to send, but code was generated:', verificationCode);
            // In development, still return success so we can test with the code
            if(process.env['NODE_ENV']==='development'){
                console.log(`🔧 [DEV] Verification code for ${normalizedPhone}: ${verificationCode}`);
            }
        }

        // Create verification session (nulled if user navigates away)
        const verificationSessionId=verificationSessionManager.createSession(normalizedPhone,verificationCode);
        
        res.status(200).json({
            success:true,
            message:'Verification code sent to your phone',
            data:{
                phone:normalizedPhone,
                expiresIn:VERIFICATION_CODE_EXPIRY/1000,
                verificationSessionId, // Frontend uses this to maintain session
                ...(process.env['NODE_ENV']==='development' && {devCode:verificationCode})
            }
        });
    }catch(error){
        next(error);
    }
}

/**
 * Verify SMS code and return JWT token
 */
export const verifySmsCode=async (_req:Request,res:Response,next:NextFunction):Promise<void>=>{
    try{
        const {phone,code,verificationSessionId}=_req.body;

        // Verify session is active (nulled if user navigated away)
        if(verificationSessionId){
            const sessionValid=verificationSessionManager.getSession(verificationSessionId);
            if(!sessionValid){
                const error=new Error('Verification session expired or invalid. Please request a new code.') as any;
                error.statusCode=400;
                error.code='VERIFICATION_SESSION_EXPIRED';
                throw error;
            }
            
            // Update activity
            verificationSessionManager.updateActivity(verificationSessionId);
        }
        
        // Validate input
        if(!phone || !code){
            const error=new Error('Phone number and verification code are required') as any;
            error.statusCode=400;
            throw error;
        }
        
        // Strip all non-digit characters
        const digitsOnly=phone.replace(/\D/g,'');
        
        // Validate exactly 10 digits
        if(digitsOnly.length!==10){
            const error=new Error('Phone number must be exactly 10 digits') as any;
            error.statusCode=400;
            throw error;
        }
        
        // Format as +1XXXXXXXXXX for storage
        const normalizedPhone='+1'+digitsOnly;
        
        // Find user (with MongoDB fallback)
        let user: any;
        let userFromMemory=false;
        
        try{
            if(isMongoAvailable()){
                user=await User.findByPhone(normalizedPhone);
            }
        }catch(err){
            console.warn('⚠️ MongoDB query failed, checking in-memory storage:', err);
        }
        
        // Fallback to in-memory storage
        if(!user){
            user=inMemoryUsers.get(normalizedPhone);
            if(user) userFromMemory=true;
        }
        
        if(!user){
            const error=new Error('User not found') as any;
            error.statusCode=404;
            throw error;
        }
        
        // Check if verification code exists
        if(!user.verificationCode || !user.verificationCodeExpiry){
            const error=new Error('No verification code found. Please request a new code.') as any;
            error.statusCode=400;
            throw error;
        }
        
        // Check if code is expired
        if(new Date()>user.verificationCodeExpiry){
            const error=new Error('Verification code has expired. Please request a new code.') as any;
            error.statusCode=400;
            throw error;
        }
        
        // Verify code
        if(user.verificationCode!==code){
            const error=new Error('Invalid verification code') as any;
            error.statusCode=401;
            throw error;
        }
        
        // Mark user as verified
        user.isVerified=true;
        user.phoneVerified=true;
        user.verificationCode=undefined;
        user.verificationCodeExpiry=undefined;
        user.lastLogin=new Date();
        user.loginCount=(user.loginCount || 0)+1;
        
        // Save user
        if(userFromMemory){
            inMemoryUsers.set(normalizedPhone, user);
            console.log('💾 [IN-MEMORY] User verified:', normalizedPhone);
        }else{
            try{
                await user.save();
                console.log('💾 [MONGODB] User verified:', normalizedPhone);
            }catch(saveErr){
                console.warn('⚠️ MongoDB save failed after verification, using in-memory:', saveErr);
                inMemoryUsers.set(normalizedPhone, user);
                userFromMemory=true;
            }
        }
        
        // Delete verification session (successful verification)
        if(verificationSessionId){
            verificationSessionManager.deleteSession(verificationSessionId);
        }

        // Generate JWT tokens with fingerprinting
        const tokenPair=JWTUtils.generateTokenPair({
            userId:user._id.toString(),
            phone:user.phone,
            username:user.username,
            email:user.email,
            role:user.role
        },_req.get('User-Agent'),_req.ip);
        
        // Store refresh token
        user.refreshToken=tokenPair.refreshToken;
        
        if(userFromMemory){
            inMemoryUsers.set(normalizedPhone, user);
        }else{
            try{
                await user.save();
            }catch(saveErr){
                console.warn('⚠️ MongoDB save failed for refresh token:', saveErr);
                // Continue anyway, token is in JWT
            }
        }
        
        // Determine redirect URL based on role and environment
        let redirectUrl='http://localhost:5002'; // Default to client dashboard (use http for localhost)
        
        if(config.isDevelopment){
            // Development: localhost URLs (use http, not https)
            switch(user.role){
                case 'customer':
                    redirectUrl='http://localhost:5002'; // client_V0
                    break;
                case 'admin':
                case 'manager':
                    redirectUrl='http://localhost:5004'; // admin_V0
                    break;
                case 'shiftlead':
                    redirectUrl='http://localhost:5005'; // shiftlead_V0
                    break;
                case 'mover':
                    redirectUrl='http://localhost:5006'; // mover_V0
                    break;
                default:
                    redirectUrl='http://localhost:5002';
            }
        }else{
            // Production: domain URLs
            switch(user.role){
                case 'customer':
                    redirectUrl=config.CUSTOMER_DASHBOARD_URL || 'https://dashboard.packmovego.com';
                    break;
                case 'admin':
                case 'manager':
                    redirectUrl=config.ADMIN_DASHBOARD_URL || 'https://admin.packmovego.com';
                    break;
                case 'mover':
                    redirectUrl=config.MOVER_DASHBOARD_URL || 'https://mover.packmovego.com';
                    break;
                default:
                    redirectUrl='https://dashboard.packmovego.com';
            }
        }
        
        // Return user data without sensitive fields
        const userData=user.toJSON?user.toJSON():user;
        delete userData.password;
        delete userData.refreshToken;
        delete userData.verificationCode;
        delete userData.verificationCodeExpiry;
        delete userData.twoFactorSecret;
        delete userData.backupCodes;
        delete userData.passwordHistory;
        
        // Send email notification (async, don't wait)
        if(user.email){
            emailService.sendSigninNotification({
                email:user.email,
                phone:user.phone,
                timestamp:new Date(),
                ipAddress:_req.ip || _req.headers['x-forwarded-for'] as string,
                userAgent:_req.headers['user-agent']
            }).catch(err => console.warn('Email notification failed:', err));
        }
        
        console.log(`🎯 [SIGNIN-REDIRECT] User ${user.role} redirecting to: ${redirectUrl}`);
        
        // Calculate token expiration in milliseconds (JWT_EXPIRE_IN is '24h')
        const expiresInHours=24; // Default 24 hours
        const expiresInMs=expiresInHours * 60 * 60 * 1000;
        
        res.status(200).json({
            success:true,
            message:'Phone verified successfully',
            data:{
                accessToken:tokenPair.accessToken,
                refreshToken:tokenPair.refreshToken,
                token:tokenPair.accessToken, // Also include as 'token' for compatibility
                user:userData,
                redirectUrl,
                expiresIn:expiresInMs // Include expiration in milliseconds
            }
        });
    }catch(error){
        next(error);
    }
}

/**
 * Refresh access token
 */
export const refreshToken=async (_req:Request,res:Response,next:NextFunction):Promise<void>=>{
    try{
        const {refreshToken}=_req.body;
        
        if(!refreshToken){
            const error=new Error('Refresh token is required') as any;
            error.statusCode=400;
            throw error;
        }
        
        // Verify refresh token
        const decoded=await JWTUtils.verifyRefreshToken(refreshToken);
        if(!decoded){
            const error=new Error('Invalid or expired refresh token') as any;
            error.statusCode=401;
            throw error;
        }
        
        // Find user
        const user=await (User as any).findById(decoded.userId);
        if(!user){
            const error=new Error('User not found') as any;
            error.statusCode=404;
            throw error;
        }
        
        // Generate new access token
        const newAccessToken=JWTUtils.generateAccessToken({
            userId:user._id.toString(),
            phone:user.phone,
            username:user.username,
            email:user.email,
            role:user.role
        });
        
        res.status(200).json({
            success:true,
            message:'Token refreshed successfully',
            data:{
                accessToken:newAccessToken
            }
        });
    }catch(error){
        next(error);
    }
}

/**
 * Get auth status
 */
export const getAuthStatus=async (_req:Request,res:Response,next:NextFunction)=>{
    try{
        // User is attached by auth middleware
        const user=(_req as any).user;
        
        if(!user){
            return res.status(200).json({
                success:true,
                data:{
                    isAuthenticated:false
                }
            });
        }
        
        // Return user data without sensitive fields
        const userData=user.toJSON?user.toJSON():user;
        delete userData.password;
        delete userData.refreshToken;
        
        return res.status(200).json({
            success:true,
            data:{
                isAuthenticated:true,
                user:userData
            }
        });
    }catch(error){
        return next(error);
    }
}

