import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

export const connectDB = async () => {
  // If no MongoDB URI is provided, skip connection
  if (!MONGODB_URI) {
    console.log('No MONGODB_URI provided - skipping database connection');
    return;
  }

  console.log('Attempting to connect to MongoDB...');
  console.log('URI format check:', MONGODB_URI.startsWith('mongodb+srv://'));
  console.log('Username check:', MONGODB_URI.includes('rhamseyswork'));

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'packgomove', // Explicitly set the database name
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 5,  // Minimum number of connections in the pool
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });
    console.log('MongoDB connected successfully to packgomove database');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB disconnection:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('MongoDB connection error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // In development, don't crash the app if MongoDB is not available
    if (process.env.NODE_ENV === 'development') {
      console.log('Continuing without MongoDB connection in development mode');
      return;
    }
    
    process.exit(1);
  }
}; 