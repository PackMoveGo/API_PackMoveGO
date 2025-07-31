import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from config directory
dotenv.config({ path: path.join(__dirname, '../../config/.env') });

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  console.log('🔄 connectDB function called');
  
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.log('⚠️ MONGODB_URI not found in environment variables');
      isConnected = false;
      return;
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    console.log('URI exists:', !!mongoUri);
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Mongoose.connect() completed');
    console.log('Ready state after connect:', mongoose.connection.readyState);

    // Set up connection event handlers
    const db = mongoose.connection;
    
    db.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      isConnected = false;
    });
    
    db.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });
    
    db.once('open', () => {
      console.log('✅ MongoDB connection opened');
      isConnected = true;
    });
    
    db.once('connected', () => {
      console.log('✅ MongoDB connected event fired');
      isConnected = true;
    });

    // Check if already connected
    if (db.readyState === 1) {
      console.log('✅ MongoDB Atlas connected successfully');
      isConnected = true;
    }
    
    console.log('Final ready state:', db.readyState);
    console.log('Final isConnected:', isConnected);
    
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    isConnected = false;
    // Don't throw error - let the app continue without MongoDB
  }
};

export const getConnectionStatus = (): boolean => {
  // Also check mongoose connection state
  const dbState = mongoose.connection.readyState;
  const connected = dbState === 1;
  
  if (connected && !isConnected) {
    console.log('🔄 Updating connection status to connected');
    isConnected = true;
  }
  
  return isConnected || connected;
};

export default connectDB; 