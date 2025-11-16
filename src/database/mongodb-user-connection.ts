import mongoose from 'mongoose';
import { config } from '../../config/env';

const NODE_ENV=config.NODE_ENV || 'development';
const isDevelopment=NODE_ENV==='development';

// Dedicated connection for user management database
let userDbConnection: typeof mongoose | null=null;

export const connectToUserDatabase=async ()=>{
    // Skip if already connected
    if(userDbConnection && userDbConnection.connection.readyState===1){
        console.log('✅ User database already connected');
        return userDbConnection;
    }

    // In development, MongoDB is optional
    if(!config.MONGODB_URI){
        if(isDevelopment){
            console.warn('⚠️  User MongoDB configuration missing - using JSON fallbacks in development');
            return null;
        }else{
            console.error('❌ User MongoDB configuration missing');
            throw new Error('Please define the MONGODB_URI environment variable');
        }
    }

    try {
        console.log('🔌 Connecting to User Management Database...');
        
        // Create separate connection for user database
        userDbConnection=await mongoose.connect(config.MONGODB_URI,{
            dbName: 'pack-move-go-users', // Separate database for user management
        });
        
        console.log(`✅ Connected to User Management Database in ${NODE_ENV} mode`);
        return userDbConnection;
    } catch(error){
        console.error('❌ Error connecting to User Management Database',error);
        
        if(isDevelopment){
            console.warn('⚠️  User MongoDB connection failed in development - server will continue');
            return null;
        }else{
            throw error;
        }
    }
};

export const getUserDbConnection=()=>{
    if(!userDbConnection){
        console.warn('⚠️  User database not connected');
        return null;
    }
    return userDbConnection;
};

export const disconnectUserDatabase=async ()=>{
    if(userDbConnection){
        await userDbConnection.connection.close();
        userDbConnection=null;
        console.log('✅ User database connection closed');
    }
};

export default connectToUserDatabase;

