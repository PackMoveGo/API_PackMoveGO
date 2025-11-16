import User from '../models/userModel';
import mongoose from 'mongoose';

export interface IUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface MongoError extends Error {
  code?: number;
}

export const createUser=async (userData: IUserData) => {
  try {
    console.log('Attempting to create user with email:', userData.email);
    
    const existingUser=await (User as any).findOne({email: userData.email});
    if(existingUser) {
      console.log('User already exists with email:', userData.email);
      throw new Error('Email already registered');
    }

    const user=new (User as any)(userData);
    await user.save();
    console.log('User created successfully:', user._id);
    return user;
  }catch(error){
    console.error('Error in createUser:', error);
    if(error instanceof mongoose.Error.ValidationError){
      throw error;
    }
    // Check for duplicate key error (MongoDB error code 11000)
    const mongoError=error as MongoError;
    if(mongoError.code===11000){
      throw new Error('Email already registered');
    }
    throw new Error('Error creating user');
  }
};

export const findUserByEmail=async (email: string) => {
  try {
    console.log('Searching for user with email:', email);
    const user=await (User as any).findOne({email});
    if(user) {
      console.log('User found:', user._id);
    }else{
      console.log('No user found with email:', email);
    }
    return user;
  }catch(error){
    console.error('Error in findUserByEmail:', error);
    throw new Error('Error finding user');
  }
}; 