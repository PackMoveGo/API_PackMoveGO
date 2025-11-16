import mongoose,{Schema,Document} from 'mongoose';

export interface ITokenBlacklist extends Document{
  token:string;
  tokenHash:string;
  userId:string;
  reason:string;
  expiresAt:Date;
  createdAt:Date;
}

const TokenBlacklistSchema:Schema=new Schema({
  token:{type:String,required:false,select:false}, // Store hash only for security
  tokenHash:{type:String,required:true,unique:true,index:true},
  userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  reason:{type:String,required:true,enum:['logout','revoked','expired','security']},
  expiresAt:{type:Date,required:true,index:true}, // TTL for automatic cleanup
  createdAt:{type:Date,default:Date.now}
});

// Create TTL index to auto-delete expired tokens
TokenBlacklistSchema.index({expiresAt:1},{expireAfterSeconds:0});

// Check if token is blacklisted
TokenBlacklistSchema.statics.isBlacklisted=async function(tokenHash:string):Promise<boolean>{
  const count=await this.countDocuments({tokenHash,expiresAt:{$gt:new Date()}});
  return count>0;
};

// Blacklist a token
TokenBlacklistSchema.statics.blacklistToken=async function(tokenHash:string,userId:string,reason:string,expiresAt:Date):Promise<void>{
  await this.create({tokenHash,userId,reason,expiresAt});
};

// Revoke all tokens for a user
TokenBlacklistSchema.statics.revokeUserTokens=async function(userId:string,reason:string='security'):Promise<number>{
  // Find and revoke all active tokens for the user
  const result=await this.updateMany(
    {userId,expiresAt:{$gt:new Date()}},
    {$set:{reason,expiresAt:new Date()}}
  );
  return result.modifiedCount;
};

export default mongoose.model<ITokenBlacklist>('TokenBlacklist',TokenBlacklistSchema);

