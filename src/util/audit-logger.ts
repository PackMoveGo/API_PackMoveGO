import AuditLog,{AuditAction,IAuditLog} from '../models/auditLogModel';
import SanitizationUtils from './sanitization';

export interface AuditContext{
  userId:string;
  userEmail?:string;
  userRole:string;
  ipAddress:string;
  userAgent:string;
}

export interface AuditEntry{
  action:AuditAction;
  resourceType:string;
  resourceId?:string;
  changes?:{field:string,oldValue?:any,newValue?:any}[];
  success:boolean;
  errorMessage?:string;
  metadata?:Record<string,any>;
}

/**
 * Audit Logger for tracking sensitive operations
 */
export class AuditLogger{
  /**
   * Mask sensitive data before logging
   */
  private static maskSensitiveFields(data:any):any{
    if(!data)return data;

    const sensitiveFields=['password','token','secret','apiKey','ssn','cardNumber','cvv','pin'];
    const masked={...data};

    for(const field of sensitiveFields){
      if(field in masked){
        masked[field]='***masked***';
      }
    }

    // Mask email
    if(masked.email && typeof masked.email==='string'){
      masked.email=SanitizationUtils.maskEmail(masked.email);
    }

    // Mask phone
    if(masked.phone && typeof masked.phone==='string'){
      masked.phone=SanitizationUtils.maskPhone(masked.phone);
    }

    return masked;
  }

  /**
   * Log audit entry
   */
  static async log(context:AuditContext,entry:AuditEntry):Promise<void>{
    try{
      // Mask sensitive data in changes
      const maskedChanges=entry.changes?.map(change=>({
        field:change.field,
        oldValue:this.maskSensitiveFields(change.oldValue),
        newValue:this.maskSensitiveFields(change.newValue)
      }));

      // Mask metadata
      const maskedMetadata=this.maskSensitiveFields(entry.metadata);

      // Sanitize IP for storage - mask last octet for IPv4
      let sanitizedIp = context.ipAddress;
      if (sanitizedIp && sanitizedIp.includes('.')) {
        const parts = sanitizedIp.split('.');
        if (parts.length === 4) {
          sanitizedIp = `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        }
      }

      await AuditLog.log({
        userId:context.userId,
        userEmail:context.userEmail?SanitizationUtils.maskEmail(context.userEmail):undefined,
        userRole:context.userRole,
        action:entry.action,
        resourceType:entry.resourceType,
        resourceId:entry.resourceId,
        changes:maskedChanges,
        ipAddress:sanitizedIp,
        userAgent:context.userAgent.substring(0,255), // Limit length
        success:entry.success,
        errorMessage:entry.errorMessage,
        metadata:maskedMetadata
      });
    }catch(error){
      // Don't let audit logging failure break the application
      console.error('Audit logging failed:',error);
    }
  }

  /**
   * Log user creation
   */
  static async logUserCreate(context:AuditContext,newUserId:string,userData:any):Promise<void>{
    await this.log(context,{
      action:AuditAction.CREATE,
      resourceType:'User',
      resourceId:newUserId,
      success:true,
      metadata:{data:userData}
    });
  }

  /**
   * Log user update
   */
  static async logUserUpdate(context:AuditContext,targetUserId:string,changes:any[]):Promise<void>{
    await this.log(context,{
      action:AuditAction.UPDATE,
      resourceType:'User',
      resourceId:targetUserId,
      changes,
      success:true
    });
  }

  /**
   * Log user deletion
   */
  static async logUserDelete(context:AuditContext,targetUserId:string):Promise<void>{
    await this.log(context,{
      action:AuditAction.DELETE,
      resourceType:'User',
      resourceId:targetUserId,
      success:true
    });
  }

  /**
   * Log login attempt
   */
  static async logLogin(userId:string,email:string,ipAddress:string,userAgent:string,success:boolean,reason?:string):Promise<void>{
    await this.log(
      {userId,userEmail:email,userRole:'',ipAddress,userAgent},
      {
        action:AuditAction.LOGIN,
        resourceType:'Authentication',
        success,
        errorMessage:success?undefined:reason
      }
    );
  }

  /**
   * Log password change
   */
  static async logPasswordChange(context:AuditContext,success:boolean,reason?:string):Promise<void>{
    await this.log(context,{
      action:AuditAction.PASSWORD_CHANGE,
      resourceType:'User',
      resourceId:context.userId,
      success,
      errorMessage:success?undefined:reason
    });
  }

  /**
   * Log role change
   */
  static async logRoleChange(context:AuditContext,targetUserId:string,oldRole:string,newRole:string):Promise<void>{
    await this.log(context,{
      action:AuditAction.ROLE_CHANGE,
      resourceType:'User',
      resourceId:targetUserId,
      changes:[{field:'role',oldValue:oldRole,newValue:newRole}],
      success:true
    });
  }

  /**
   * Log permission change
   */
  static async logPermissionChange(context:AuditContext,targetUserId:string,permission:string,granted:boolean):Promise<void>{
    await this.log(context,{
      action:AuditAction.PERMISSION_CHANGE,
      resourceType:'User',
      resourceId:targetUserId,
      changes:[{field:'permission',oldValue:!granted,newValue:granted}],
      success:true,
      metadata:{permission,granted}
    });
  }

  /**
   * Log data export
   */
  static async logDataExport(context:AuditContext,resourceType:string,recordCount:number):Promise<void>{
    await this.log(context,{
      action:AuditAction.EXPORT,
      resourceType,
      success:true,
      metadata:{recordCount}
    });
  }

  /**
   * Get recent audit logs
   */
  static async getRecentLogs(limit:number=100):Promise<IAuditLog[]>{
    return await AuditLog.find().sort({timestamp:-1}).limit(limit);
  }

  /**
   * Get user activity history
   */
  static async getUserActivity(userId:string,limit:number=50):Promise<IAuditLog[]>{
    return await AuditLog.getUserLogs(userId,limit);
  }

  /**
   * Get failed operations
   */
  static async getFailedOperations(limit:number=100):Promise<IAuditLog[]>{
    return await AuditLog.getFailedOperations(limit);
  }
}

export default AuditLogger;

