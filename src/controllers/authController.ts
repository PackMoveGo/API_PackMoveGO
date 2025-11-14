import {Request,Response,NextFunction} from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel';

const JWT_SECRET=process.env.JWT_SECRET || '';
const JWT_EXPIRE_IN=process.env.JWT_EXPIRES_IN || '24h';

export const signUp=async (req:Request,res:Response,next:NextFunction)=>{
    const session=await mongoose.startSession();
    session.startTransaction();
    try{
        const {name,email,password,location}=req.body;
        // Check if user already exists
        const existingUser=await (User.findOne as any)({email});
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
        
        const newUsers=await (User.create as any)([userData],{session});
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

export const signIn=async (req:Request,res:Response,next:NextFunction)=>{
    try{
        const {email,password,location}=req.body;
        
        // Validate input
        if(!email || !password){
            const error=new Error('Email and password are required') as any;
            error.statusCode=400;
            throw error;
        }
        
        // Find user by email (case-insensitive)
        const user=await (User.findOne as any)({email: email.toLowerCase().trim()});
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
        
        // Return user data without password
        const userData=user.toJSON();
        delete userData.password;
        delete userData.refreshToken;
        
        res.status(200).json({
            success:true,
            message:'User signed in successfully',
            data:{
                token,
                user:userData,
            }
        });
    }catch(error){
        next(error);
    }
}

export const signOut=async (req:Request,res:Response,next:NextFunction)=>{
    // Implement sign out logic here
}

