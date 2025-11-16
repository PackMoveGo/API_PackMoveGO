/**
 * Seed Test Users for Development
 * Creates test user for authentication testing
 */

import mongoose from 'mongoose';
// @ts-ignore - Import kept for reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _bcrypt from 'bcryptjs';
import User from '../models/userModel';
import {config} from '../../config/env';

const TEST_USERS=[
    {
        phone:'+19494145282',
        username:'packmovegotesteruser',
        firstName:'John',
        lastName:'do',
        role:'customer',
        isActive:true,
        isVerified:false,
        phoneVerified:false
    }
];

async function seedUsers(){
    try{
        // Connect to MongoDB
        if(!config.MONGODB_URI){
            console.error('❌ MONGODB_URI not set');
            process.exit(1);
        }
        
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        console.log('🌱 Seeding test users...');
        
        // Clear existing test users
        await User.deleteMany({username:{$in:TEST_USERS.map(u=>u.username)}});
        console.log('🧹 Cleared existing test users');
        
        // Create test users
        for(const userData of TEST_USERS){
            const user=new User(userData);
            await user.save();
            console.log(`✅ Created user: ${userData.username} (${userData.phone})`);
        }
        
        console.log('✅ Successfully seeded all test users!');
        console.log('\n📋 Test Users:');
        TEST_USERS.forEach((user,idx)=>{
            console.log(`   ${idx+1}. ${user.username}`);
            console.log(`      Phone: ${user.phone}`);
            console.log(`      To sign in: Use phone number and request SMS code\n`);
        });
        
        process.exit(0);
    }catch(error){
        console.error('❌ Error seeding user:',error);
        process.exit(1);
    }
}

// Run seed function if called directly
if(require.main===module){
    seedUsers();
}

export default seedUsers;
export {TEST_USERS};

