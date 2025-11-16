import crypto from 'crypto';

export interface AccountLockInfo{
  isLocked:boolean;
  lockUntil?:Date;
  remainingAttempts:number;
}

export interface SecurityNotification{
  type:'login'|'password_change'|'mfa_enabled'|'suspicious_activity'|'account_locked';
  message:string;
  timestamp:Date;
  ipAddress:string;
  userAgent:string;
  location?:string;
}

export class AccountSecurityUtils{
  private static readonly MAX_LOGIN_ATTEMPTS=5;
  private static readonly LOCK_TIME=30*60*1000; // 30 minutes
  private static readonly REQUIRE_CAPTCHA_AFTER=3;

  /**
   * Check if account is locked
   */
  static isAccountLocked(lockUntil?:Date):boolean{
    if(!lockUntil)return false;
    return new Date()<lockUntil;
  }

  /**
   * Get account lock info
   */
  static getAccountLockInfo(loginAttempts:number,lockUntil?:Date):AccountLockInfo{
    const isLocked=this.isAccountLocked(lockUntil);
    const remainingAttempts=Math.max(0,this.MAX_LOGIN_ATTEMPTS-loginAttempts);

    return{
      isLocked,
      lockUntil:isLocked?lockUntil:undefined,
      remainingAttempts
    };
  }

  /**
   * Calculate lock expiry time
   */
  static calculateLockExpiry():Date{
    return new Date(Date.now()+this.LOCK_TIME);
  }

  /**
   * Check if CAPTCHA is required
   */
  static requiresCaptcha(loginAttempts:number):boolean{
    return loginAttempts>=this.REQUIRE_CAPTCHA_AFTER;
  }

  /**
   * Generate security notification
   */
  static createSecurityNotification(
    type:SecurityNotification['type'],
    ipAddress:string,
    userAgent:string,
    location?:string
  ):SecurityNotification{
    const messages={
      login:'New login detected',
      password_change:'Password was changed',
      mfa_enabled:'Two-factor authentication was enabled',
      suspicious_activity:'Suspicious activity detected on your account',
      account_locked:'Account locked due to multiple failed login attempts'
    };

    return{
      type,
      message:messages[type],
      timestamp:new Date(),
      ipAddress,
      userAgent,
      location
    };
  }

  /**
   * Detect suspicious activity
   */
  static detectSuspiciousActivity(
    currentIp:string,
    lastKnownIps:string[],
    currentLocation?:string,
    lastKnownLocation?:string
  ):boolean{
    // Check if IP is significantly different
    if(lastKnownIps.length>0 && !lastKnownIps.includes(currentIp)){
      // Check if location is different (if available)
      if(currentLocation && lastKnownLocation){
        const locationChanged=currentLocation!==lastKnownLocation;
        if(locationChanged)return true;
      }
    }

    return false;
  }

  /**
   * Generate account recovery token
   */
  static generateRecoveryToken():string{
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash recovery token
   */
  static hashRecoveryToken(token:string):string{
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate security question hash
   */
  static hashSecurityAnswer(answer:string):string{
    // Normalize answer (lowercase, trim, remove extra spaces)
    const normalized=answer.toLowerCase().trim().replace(/\s+/g,' ');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Verify security answer
   */
  static verifySecurityAnswer(answer:string,hash:string):boolean{
    const hashedInput=this.hashSecurityAnswer(answer);
    return crypto.timingSafeEqual(Buffer.from(hashedInput),Buffer.from(hash));
  }

  /**
   * Calculate password age in days
   */
  static getPasswordAge(lastPasswordChange:Date):number{
    const now=new Date();
    const diff=now.getTime()-lastPasswordChange.getTime();
    return Math.floor(diff/(1000*60*60*24));
  }

  /**
   * Check if password change is required (e.g., after 90 days)
   */
  static requiresPasswordChange(lastPasswordChange:Date,maxAgeDays:number=90):boolean{
    return this.getPasswordAge(lastPasswordChange)>maxAgeDays;
  }

  /**
   * Sanitize IP address for logging
   */
  static sanitizeIpForLogging(ip:string):string{
    // Mask last octet for IPv4
    if(ip.includes('.')){
      const parts=ip.split('.');
      if(parts.length===4){
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
      }
    }
    // Mask last segment for IPv6
    if(ip.includes(':')){
      const parts=ip.split(':');
      if(parts.length>2){
        return parts.slice(0,-2).join(':')+':xxxx:xxxx';
      }
    }
    return 'xxx.xxx.xxx.xxx';
  }
}

export default AccountSecurityUtils;

