#!/usr/bin/env node

/**
 * User Management Utility
 * Manage users in MongoDB
 */

const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const dotenv=require('dotenv');
const path=require('path');

// Load environment
const envFile=process.env.NODE_ENV==='production'
  ?path.join(__dirname,'../config/.env.production.local')
  :path.join(__dirname,'../config/.env.development.local');

dotenv.config({path:envFile});

// User schema (simplified)
const userSchema=new mongoose.Schema({
  phone:{type:String,required:true,unique:true},
  email:{type:String,sparse:true},
  username:{type:String},
  password:{type:String},
  role:{type:String,enum:['customer','mover','admin','manager'],default:'customer'},
  isActive:{type:Boolean,default:true},
  isVerified:{type:Boolean,default:true},
  phoneVerified:{type:Boolean,default:true}
},{timestamps:true});

const User=mongoose.model('User',userSchema);

// Connect to MongoDB
async function connect(){
  try{
    await mongoose.connect(process.env.MONGODB_URI||'');
    console.log('✅ Connected to MongoDB');
  }catch(error){
    console.error('❌ MongoDB connection failed:',error);
    process.exit(1);
  }
}

// Remove user by phone
async function removeUser(phone){
  try{
    const result=await User.deleteOne({phone});
    
    if(result.deletedCount>0){
      console.log(`✅ Deleted user with phone: ${phone}`);
    }else{
      console.log(`ℹ️  No user found with phone: ${phone}`);
    }
  }catch(error){
    console.error('❌ Error deleting user:',error);
  }
}

// Add user
async function addUser(phone,password,role='customer',email=null,username=null){
  try{
    // Check if user exists
    const existing=await User.findOne({phone});
    if(existing){
      console.log(`⚠️  User already exists with phone: ${phone}`);
      return;
    }

    // Hash password
    const salt=await bcrypt.genSalt(12);
    const hashedPassword=await bcrypt.hash(password,salt);

    // Use provided username, derive from email, or generate from phone
    const finalUsername=username||(email?email.split('@')[0]:`user_${phone.slice(-4)}`);
    
    const user=await User.create({
      phone,
      password:hashedPassword,
      role,
      email,
      username:finalUsername,
      isActive:true,
      isVerified:true,
      phoneVerified:true
    });

    console.log(`✅ Created ${role} user:`,{
      phone:user.phone,
      email:user.email,
      role:user.role,
      username:user.username
    });
  }catch(error){
    console.error('❌ Error creating user:',error);
  }
}

// List all users
async function listUsers(){
  try{
    const users=await User.find({},{password:0}).lean();
    console.log(`\n📋 Total users: ${users.length}\n`);
    
    users.forEach((user,index)=>{
      console.log(`${index+1}. ${user.role.toUpperCase()}: ${user.phone} (${user.email||'no email'})`);
      console.log(`   - Username: ${user.username||'N/A'}`);
      console.log(`   - Active: ${user.isActive}`);
      console.log(`   - Verified: ${user.isVerified}`);
      console.log('');
    });
  }catch(error){
    console.error('❌ Error listing users:',error);
  }
}

// Main function
async function main(){
  const command=process.argv[2];
  const args=process.argv.slice(3);

  await connect();

  switch(command){
    case 'add':
      if(args.length<2){
        console.log('Usage: node manage-users.js add <phone> <password> [role] [email] [username]');
        console.log('Example: node manage-users.js add +19494145282 PackMoveGOAdmin2! admin rhamseys@packmovego.com "Rhamseys Gacria"');
        break;
      }
      await addUser(args[0],args[1],args[2]||'customer',args[3]||null,args[4]||null);
      break;

    case 'remove':
      if(args.length<1){
        console.log('Usage: node manage-users.js remove <phone>');
        console.log('Example: node manage-users.js remove 5555555555');
        break;
      }
      await removeUser(args[0]);
      break;

    case 'list':
      await listUsers();
      break;

    default:
      console.log('PackMoveGO User Management\n');
      console.log('Commands:');
      console.log('  add <phone> <password> [role] [email] [username]  - Add user');
      console.log('  remove <phone>                                      - Remove user');
      console.log('  list                                                - List all users');
      console.log('\nRoles: customer, mover, manager, admin');
      console.log('\nExamples:');
      console.log('  node manage-users.js add +19494145282 PackMoveGOAdmin2! admin rhamseys@packmovego.com "Rhamseys Gacria"');
      console.log('  node manage-users.js remove +19494145282');
      console.log('  node manage-users.js list');
  }

  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
}

main().catch(error=>{
  console.error('❌ Fatal error:',error);
  process.exit(1);
});

