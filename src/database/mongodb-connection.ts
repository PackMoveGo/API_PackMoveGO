import mongoose from 'mongoose';
import { config } from '../../config/env';

const DB_URI=config.MONGODB_URI || config.DATABASE_URL;
const NODE_ENV=config.NODE_ENV || 'development';

if(!DB_URI){
    console.error('❌ MongoDB configuration missing');
    console.error('   MONGODB_URI:', config.MONGODB_URI ? 'SET' : 'NOT SET');
    console.error('   DATABASE_URL:', config.DATABASE_URL ? 'SET' : 'NOT SET');
    throw new Error('Please define the MONGODB_URI or DB_URI environment variable');
}

const connectToDatabase=async ()=>{
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(DB_URI!);
        console.log(`✅ Connected to database in ${NODE_ENV} mode`);
    } catch(error){
        console.error('❌ Error connecting to database',error);
        process.exit(1);
    }
}

export default connectToDatabase;

