import winston from 'winston';
import path from 'path';
import SanitizationUtils from './sanitization';

export enum SecurityEventType{
  LOGIN_SUCCESS='login_success',
  LOGIN_FAILED='login_failed',
  LOGOUT='logout',
  PASSWORD_CHANGE='password_change',
  PASSWORD_RESET_REQUEST='password_reset_request',
  PASSWORD_RESET_SUCCESS='password_reset_success',
  MFA_ENABLED='mfa_enabled',
  MFA_DISABLED='mfa_disabled',
  MFA_SUCCESS='mfa_success',
  MFA_FAILED='mfa_failed',
  ACCOUNT_LOCKED='account_locked',
  ACCOUNT_UNLOCKED='account_unlocked',
  PERMISSION_DENIED='permission_denied',
  SUSPICIOUS_ACTIVITY='suspicious_activity',
  RATE_LIMIT_EXCEEDED='rate_limit_exceeded',
  CSRF_VIOLATION='csrf_violation',
  XSS_ATTEMPT='xss_attempt',
  INJECTION_ATTEMPT='injection_attempt',
  TOKEN_REVOKED='token_revoked',
  SESSION_CREATED='session_created',
  SESSION_REVOKED='session_revoked'
}

export interface SecurityEvent{
  type:SecurityEventType;
  userId?:string;
  email?:string;
  ipAddress:string;
  userAgent:string;
  success:boolean;
  message:string;
  details?:any;
  severity:'low'|'medium'|'high'|'critical';
  timestamp:Date;
}

/**
 * Security Event Logger with PII Masking
 */
export class SecurityLogger{
  private logger:winston.Logger;

  constructor(){
    // Create logs directory if it doesn't exist
    const logsDir=path.join(process.cwd(),'logs');

    this.logger=winston.createLogger({
      level:process.env['LOG_LEVEL']||'info',
      format:winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({stack:true}),
        winston.format.json()
      ),
      transports:[
        // Security events go to separate file
        new winston.transports.File({
          filename:path.join(logsDir,'security.log'),
          level:'info',
          maxsize:10485760, // 10MB
          maxFiles:5
        }),
        // Critical security events
        new winston.transports.File({
          filename:path.join(logsDir,'security-critical.log'),
          level:'error',
          maxsize:10485760,
          maxFiles:10
        }),
        // Console in development
        ...(process.env['NODE_ENV']==='development'?[
          new winston.transports.Console({
            format:winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })
        ]:[])
      ]
    });
  }

  /**
   * Mask PII data for logging
   */
  private maskPII(event:SecurityEvent):SecurityEvent{
    const masked={...event};

    // Mask email
    if(masked.email){
      masked.email=SanitizationUtils.maskEmail(masked.email);
    }

    // Mask IP address - mask last octet for IPv4
    if(masked.ipAddress && masked.ipAddress.includes('.')){
      const parts=masked.ipAddress.split('.');
      if(parts.length===4){
        masked.ipAddress=`${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
      }
    }

    // Mask sensitive details
    if(masked.details){
      if(masked.details.password)delete masked.details.password;
      if(masked.details.token)masked.details.token='***masked***';
      if(masked.details.phone)masked.details.phone=SanitizationUtils.maskPhone(masked.details.phone);
      if(masked.details.ssn)delete masked.details.ssn;
      if(masked.details.cardNumber)delete masked.details.cardNumber;
    }

    return masked;
  }

  /**
   * Log security event
   */
  logEvent(event:SecurityEvent):void{
    const maskedEvent=this.maskPII(event);

    const logLevel=this.getLogLevel(event.severity);

    this.logger.log(logLevel,{
      ...maskedEvent,
      type:'security_event'
    });
  }

  /**
   * Get Winston log level from severity
   */
  private getLogLevel(severity:SecurityEvent['severity']):string{
    const map={
      low:'info',
      medium:'warn',
      high:'error',
      critical:'error'
    };
    return map[severity];
  }

  /**
   * Log authentication success
   */
  logLoginSuccess(userId:string,email:string,ipAddress:string,userAgent:string,method:string='password'):void{
    this.logEvent({
      type:SecurityEventType.LOGIN_SUCCESS,
      userId,
      email,
      ipAddress,
      userAgent,
      success:true,
      message:`User logged in successfully using ${method}`,
      severity:'low',
      timestamp:new Date(),
      details:{method}
    });
  }

  /**
   * Log authentication failure
   */
  logLoginFailure(email:string,ipAddress:string,userAgent:string,reason:string):void{
    this.logEvent({
      type:SecurityEventType.LOGIN_FAILED,
      email,
      ipAddress,
      userAgent,
      success:false,
      message:`Login failed: ${reason}`,
      severity:'medium',
      timestamp:new Date(),
      details:{reason}
    });
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(userId:string,ipAddress:string,userAgent:string,description:string,details?:any):void{
    this.logEvent({
      type:SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId,
      ipAddress,
      userAgent,
      success:false,
      message:description,
      severity:'high',
      timestamp:new Date(),
      details
    });
  }

  /**
   * Log account locked
   */
  logAccountLocked(userId:string,email:string,ipAddress:string,userAgent:string,reason:string):void{
    this.logEvent({
      type:SecurityEventType.ACCOUNT_LOCKED,
      userId,
      email,
      ipAddress,
      userAgent,
      success:false,
      message:`Account locked: ${reason}`,
      severity:'high',
      timestamp:new Date(),
      details:{reason}
    });
  }

  /**
   * Log permission denied
   */
  logPermissionDenied(userId:string,resource:string,action:string,ipAddress:string,userAgent:string):void{
    this.logEvent({
      type:SecurityEventType.PERMISSION_DENIED,
      userId,
      ipAddress,
      userAgent,
      success:false,
      message:`Permission denied for ${action} on ${resource}`,
      severity:'medium',
      timestamp:new Date(),
      details:{resource,action}
    });
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(userId:string|undefined,ipAddress:string,endpoint:string):void{
    this.logEvent({
      type:SecurityEventType.RATE_LIMIT_EXCEEDED,
      userId,
      ipAddress,
      userAgent:'',
      success:false,
      message:`Rate limit exceeded for ${endpoint}`,
      severity:'medium',
      timestamp:new Date(),
      details:{endpoint}
    });
  }

  /**
   * Log CSRF violation
   */
  logCSRFViolation(ipAddress:string,userAgent:string,endpoint:string):void{
    this.logEvent({
      type:SecurityEventType.CSRF_VIOLATION,
      ipAddress,
      userAgent,
      success:false,
      message:`CSRF violation detected on ${endpoint}`,
      severity:'high',
      timestamp:new Date(),
      details:{endpoint}
    });
  }

  /**
   * Log injection attempt
   */
  logInjectionAttempt(ipAddress:string,userAgent:string,payload:any):void{
    this.logEvent({
      type:SecurityEventType.INJECTION_ATTEMPT,
      ipAddress,
      userAgent,
      success:false,
      message:'SQL/NoSQL injection attempt detected',
      severity:'critical',
      timestamp:new Date(),
      details:{payload:JSON.stringify(payload).substring(0,200)}
    });
  }
}

// Export singleton instance
export const securityLogger=new SecurityLogger();

export default securityLogger;

