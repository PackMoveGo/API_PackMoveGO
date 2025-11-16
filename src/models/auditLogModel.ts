import mongoose,{Schema,Document} from 'mongoose';

export enum AuditAction{
  CREATE='create',
  UPDATE='update',
  DELETE='delete',
  READ='read',
  LOGIN='login',
  LOGOUT='logout',
  PERMISSION_CHANGE='permission_change',
  ROLE_CHANGE='role_change',
  PASSWORD_CHANGE='password_change',
  SETTINGS_CHANGE='settings_change',
  EXPORT='export',
  IMPORT='import'
}

export interface IAuditLog extends Document{
  userId:string;
  userEmail?:string;
  userRole:string;
  action:AuditAction;
  resourceType:string;
  resourceId?:string;
  changes?:{
    field:string;
    oldValue?:any;
    newValue?:any;
  }[];
  ipAddress:string;
  userAgent:string;
  success:boolean;
  errorMessage?:string;
  metadata?:Record<string,any>;
  timestamp:Date;
}

const AuditLogSchema:Schema=new Schema({
  userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  userEmail:{type:String,index:true},
  userRole:{type:String,required:true,index:true},
  action:{
    type:String,
    required:true,
    enum:Object.values(AuditAction),
    index:true
  },
  resourceType:{type:String,required:true,index:true},
  resourceId:{type:String,index:true},
  changes:[{
    field:{type:String,required:true},
    oldValue:{type:Schema.Types.Mixed},
    newValue:{type:Schema.Types.Mixed}
  }],
  ipAddress:{type:String,required:true},
  userAgent:{type:String,required:true},
  success:{type:Boolean,default:true,index:true},
  errorMessage:{type:String},
  metadata:{type:Schema.Types.Mixed},
  timestamp:{type:Date,default:Date.now,index:true}
});

// Compound indexes for efficient queries
AuditLogSchema.index({userId:1,timestamp:-1});
AuditLogSchema.index({resourceType:1,resourceId:1,timestamp:-1});
AuditLogSchema.index({action:1,timestamp:-1});
AuditLogSchema.index({timestamp:-1}); // For cleanup

// Create audit log entry
AuditLogSchema.statics.log=async function(entry:Partial<IAuditLog>):Promise<IAuditLog>{
  return await this.create(entry);
};

// Get audit logs for a user
AuditLogSchema.statics.getUserLogs=async function(userId:string,limit:number=100):Promise<IAuditLog[]>{
  return await this.find({userId}).sort({timestamp:-1}).limit(limit);
};

// Get audit logs for a resource
AuditLogSchema.statics.getResourceLogs=async function(resourceType:string,resourceId:string,limit:number=100):Promise<IAuditLog[]>{
  return await this.find({resourceType,resourceId}).sort({timestamp:-1}).limit(limit);
};

// Get audit logs by action
AuditLogSchema.statics.getLogsByAction=async function(action:AuditAction,limit:number=100):Promise<IAuditLog[]>{
  return await this.find({action}).sort({timestamp:-1}).limit(limit);
};

// Get failed operations
AuditLogSchema.statics.getFailedOperations=async function(limit:number=100):Promise<IAuditLog[]>{
  return await this.find({success:false}).sort({timestamp:-1}).limit(limit);
};

export default mongoose.model<IAuditLog>('AuditLog',AuditLogSchema);

