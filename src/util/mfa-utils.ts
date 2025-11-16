import speakeasy from 'speakeasy';
import crypto from 'crypto';

export interface TOTPSetup{
  secret:string;
  qrCodeUrl:string;
  backupCodes:string[];
}

export interface TOTPVerification{
  isValid:boolean;
  remainingAttempts?:number;
}

export class MFAUtils{
  private static readonly APP_NAME='PackMoveGO';
  private static readonly BACKUP_CODES_COUNT=10;
  // CODE_LENGTH is 6 for TOTP codes

  /**
   * Generate TOTP secret for a user
   */
  static generateTOTPSecret(userEmail:string):TOTPSetup{
    const secret=speakeasy.generateSecret({
      name:`${this.APP_NAME} (${userEmail})`,
      length:32
    });

    const backupCodes=this.generateBackupCodes();

    return{
      secret:secret.base32,
      qrCodeUrl:secret.otpauth_url || '',
      backupCodes
    };
  }

  /**
   * Verify TOTP token
   */
  static verifyTOTP(token:string,secret:string,window:number=1):boolean{
    // Remove spaces and dashes from token
    const cleanToken=token.replace(/[\s-]/g,'');

    return speakeasy.totp.verify({
      secret:secret,
      encoding:'base32',
      token:cleanToken,
      window:window // Allow 1 step before and after for clock drift
    });
  }

  /**
   * Generate backup codes for 2FA
   */
  static generateBackupCodes():string[]{
    const codes:string[]=[];
    
    for(let i=0;i<this.BACKUP_CODES_COUNT;i++){
      const code=crypto.randomBytes(4).toString('hex').toUpperCase();
      // Format as XXXX-XXXX
      codes.push(`${code.substring(0,4)}-${code.substring(4)}`);
    }
    
    return codes;
  }

  /**
   * Hash backup code for storage
   */
  static hashBackupCode(code:string):string{
    // Remove dashes before hashing
    const cleanCode=code.replace(/-/g,'');
    return crypto.createHash('sha256').update(cleanCode).digest('hex');
  }

  /**
   * Verify backup code
   */
  static verifyBackupCode(code:string,hashedCodes:string[]):boolean{
    const hashedInput=this.hashBackupCode(code);
    return hashedCodes.includes(hashedInput);
  }

  /**
   * Get current TOTP token (for testing)
   */
  static getCurrentTOTP(secret:string):string{
    return speakeasy.totp({
      secret:secret,
      encoding:'base32'
    });
  }

  /**
   * Generate SMS verification code (6 digits)
   */
  static generateSMSCode():string{
    return crypto.randomInt(100000,999999).toString();
  }

  /**
   * Hash SMS code for storage
   */
  static hashSMSCode(code:string):string{
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify SMS code
   */
  static verifySMSCode(code:string,hashedCode:string):boolean{
    const hashedInput=this.hashSMSCode(code);
    return crypto.timingSafeEqual(Buffer.from(hashedInput),Buffer.from(hashedCode));
  }

  /**
   * Check if MFA token is expired
   */
  static isTokenExpired(expiryDate:Date):boolean{
    return new Date()>expiryDate;
  }

  /**
   * Get token expiry time (10 minutes from now)
   */
  static getTokenExpiry():Date{
    return new Date(Date.now()+10*60*1000);
  }
}

export default MFAUtils;

