import { Request, Response } from 'express';
import { createUser, findUserByEmail } from '../service/userService';
import mongoose from 'mongoose';

export const signup = async (req: Request, res: Response) => {
    try {
    const { firstName, lastName, email, phone } = req.body;

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
        isDuplicate: true,
        field: 'email'
      });
    }

    // Create new user
    const user = await createUser({ firstName, lastName, email, phone });

    res.status(201).json({
      success: true,
      message: 'Signup successful',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });

    } catch (error) {
    console.error('Signup error:', error);

    if (error instanceof mongoose.Error.ValidationError) {
      const formattedErrors = error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key]?.message || 'Validation error'
      })) : [];

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred during signup'
    });
    }
    return; // Explicit return for TypeScript
}; 