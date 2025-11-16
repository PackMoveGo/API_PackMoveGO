import mongoose from 'mongoose';
import { config } from '../../config/env';

const NODE_ENV=config.NODE_ENV || 'development';
const isDevelopment=NODE_ENV==='development';

// In development, MongoDB is optional - allow server to run with JSON fallbacks
if(!config.MONGODB_URI){
    if(isDevelopment){
        console.warn('⚠️  MongoDB configuration missing - server will use JSON fallbacks in development');
        console.warn('   MONGODB_URI:', config.MONGODB_URI ? 'SET' : 'NOT SET');
    }else{
    console.error('❌ MongoDB configuration missing');
    console.error('   MONGODB_URI:', config.MONGODB_URI ? 'SET' : 'NOT SET');
    throw new Error('Please define the MONGODB_URI environment variable');
    }
}

const connectToDatabase=async ()=>{
    // Skip MongoDB connection in development if URI not set
    if(!config.MONGODB_URI && isDevelopment){
        console.log('⚠️  Skipping MongoDB connection in development - using JSON fallbacks');
        return;
    }

    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.MONGODB_URI);
        console.log(`✅ Connected to database in ${NODE_ENV} mode`);
    } catch(error){
        console.error('❌ Error connecting to database',error);
        
        // In development, warn but don't exit - allow server to continue with JSON fallbacks
        if(isDevelopment){
            console.warn('⚠️  MongoDB connection failed in development - server will use JSON fallbacks');
            console.warn('   You can continue development with JSON data files');
            console.warn('   To fix this: Check your MongoDB Atlas IP whitelist or use local MongoDB');
        }else{
            // In production, exit on connection failure
        process.exit(1);
        }
    }
}

export default connectToDatabase;

