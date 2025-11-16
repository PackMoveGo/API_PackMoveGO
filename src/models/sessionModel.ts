import mongoose,{Schema,Document} from 'mongoose';

export interface ISession extends Document{
  userId:string;
  token:string;
  tokenHash:string;
  deviceInfo:{
    userAgent:string;
    ipAddress:string;
    deviceFingerprint:string;
    platform?:string;
    browser?:string;
  };
  location?:{
    city?:string;
    country?:string;
    coordinates?:{lat:number,lon:number};
  };
  isActive:boolean;
  lastActivity:Date;
  expiresAt:Date;
  createdAt:Date;
}

const SessionSchema:Schema=new Schema({
  userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  token:{type:String,required:false,select:false}, // Don't store actual token
  tokenHash:{type:String,required:true,unique:true,index:true},
  deviceInfo:{
    userAgent:{type:String,required:true},
    ipAddress:{type:String,required:true},
    deviceFingerprint:{type:String,required:true,index:true},
    platform:{type:String},
    browser:{type:String}
  },
  location:{
    city:{type:String},
    country:{type:String},
    coordinates:{
      lat:{type:Number},
      lon:{type:Number}
    }
  },
  isActive:{type:Boolean,default:true,index:true},
  lastActivity:{type:Date,default:Date.now},
  expiresAt:{type:Date,required:true,index:true},
  createdAt:{type:Date,default:Date.now}
});

// TTL index for automatic cleanup
SessionSchema.index({expiresAt:1},{expireAfterSeconds:0});

// Compound index for efficient queries
SessionSchema.index({userId:1,isActive:1});

// Get active sessions for a user
SessionSchema.statics.getActiveSessions=async function(userId:string):Promise<ISession[]>{
  return await this.find({
    userId,
    isActive:true,
    expiresAt:{$gt:new Date()}
  }).sort({lastActivity:-1});
};

// Count active sessions for a user
SessionSchema.statics.countActiveSessions=async function(userId:string):Promise<number>{
  return await this.countDocuments({
    userId,
    isActive:true,
    expiresAt:{$gt:new Date()}
  });
};

// Create new session and enforce limits
SessionSchema.statics.createSession=async function(userId:string,tokenHash:string,deviceInfo:any,expiresAt:Date,maxSessions:number=3):Promise<ISession>{
  // Count current active sessions
  const activeCount=await this.countActiveSessions(userId);

  // If at limit, deactivate oldest session
  if(activeCount>=maxSessions){
    const oldestSession=await this.findOne({
      userId,
      isActive:true,
      expiresAt:{$gt:new Date()}
    }).sort({lastActivity:1});

    if(oldestSession){
      oldestSession.isActive=false;
      await oldestSession.save();
    }
  }

  // Create new session
  return await this.create({
    userId,
    tokenHash,
    deviceInfo,
    expiresAt
  });
};

// Update session activity
SessionSchema.statics.updateActivity=async function(tokenHash:string):Promise<void>{
  await this.updateOne({tokenHash},{$set:{lastActivity:new Date()}});
};

// Revoke session
SessionSchema.statics.revokeSession=async function(tokenHash:string):Promise<void>{
  await this.updateOne({tokenHash},{$set:{isActive:false}});
};

// Revoke all sessions for a user
SessionSchema.statics.revokeAllUserSessions=async function(userId:string):Promise<number>{
  const result=await this.updateMany({userId,isActive:true},{$set:{isActive:false}});
  return result.modifiedCount;
};

export default mongoose.model<ISession>('Session',SessionSchema);

