import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from config directory
dotenv.config({ path: path.join(__dirname, '../../config/.env') });

let isConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = 5;

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.log('⚠️ Continuing without database connection');
      return;
    }

    // Prevent multiple connection attempts
    if (isConnected) {
      console.log('✅ MongoDB already connected');
      return;
    }

    // Configure mongoose options for better stability
    const mongooseOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      retryWrites: true
    };

    await mongoose.connect(mongoUri, mongooseOptions);
    isConnected = true;
    connectionRetries = 0;
    console.log('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
      
      // Attempt to reconnect if not in production
      if (process.env.NODE_ENV !== 'production' && connectionRetries < MAX_RETRIES) {
        connectionRetries++;
        console.log(`🔄 Attempting to reconnect (${connectionRetries}/${MAX_RETRIES})...`);
        setTimeout(() => {
          connectDB().catch(console.error);
        }, 5000);
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('📦 MongoDB connection closed through app termination');
      } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
      }
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    
    // Don't throw error in development, just log it
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.log('⚠️ Continuing without database connection');
    }
  }
};

export const getConnectionStatus = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

export default connectDB; 