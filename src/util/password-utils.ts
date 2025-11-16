import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface PasswordStrength{
  score:number; // 0-4
  feedback:string[];
  isStrong:boolean;
}

export interface PasswordValidationResult{
  isValid:boolean;
  errors:string[];
  strength?:PasswordStrength;
}

export class PasswordUtils{
  private static readonly SALT_ROUNDS=12; // Increased from 10 for better security
  private static readonly MIN_LENGTH=12; // Increased from 8 for better security
  private static readonly MAX_LENGTH=128;

  /**
   * Hash a password with bcrypt (12 rounds)
   */
  static async hashPassword(password:string):Promise<string>{
    const salt=await bcrypt.genSalt(this.SALT_ROUNDS);
    return await bcrypt.hash(password,salt);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password:string,hash:string):Promise<boolean>{
    return await bcrypt.compare(password,hash);
  }

  /**
   * Check password strength
   */
  static checkPasswordStrength(password:string):PasswordStrength{
    let score=0;
    const feedback:string[]=[];

    // Length check
    if(password.length>=12) score++;
    else if(password.length<12) feedback.push('Password should be at least 12 characters');

    // Character variety
    if(/[a-z]/.test(password)) score++;
    else feedback.push('Add lowercase letters');

    if(/[A-Z]/.test(password)) score++;
    else feedback.push('Add uppercase letters');

    if(/\d/.test(password)) score++;
    else feedback.push('Add numbers');

    if(/[^a-zA-Z\d]/.test(password)) score++;
    else feedback.push('Add special characters (!@#$%^&*)');

    // Penalize common patterns
    if(/^(.)\1+$/.test(password)){
      score=Math.max(0,score-2);
      feedback.push('Avoid repeating characters');
    }

    if(/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)){
      score=Math.max(0,score-1);
      feedback.push('Avoid sequential characters');
    }

    // Normalize score to 0-4
    score=Math.min(4,Math.max(0,Math.floor(score*0.8)));

    return{
      score,
      feedback,
      isStrong:score>=3
    };
  }

  /**
   * Validate password against requirements
   */
  static validatePassword(password:string):PasswordValidationResult{
    const errors:string[]=[];

    // Length validation
    if(password.length<this.MIN_LENGTH){
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }
    if(password.length>this.MAX_LENGTH){
      errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
    }

    // Complexity requirements
    if(!/[a-z]/.test(password)){
      errors.push('Password must contain at least one lowercase letter');
    }
    if(!/[A-Z]/.test(password)){
      errors.push('Password must contain at least one uppercase letter');
    }
    if(!/\d/.test(password)){
      errors.push('Password must contain at least one number');
    }
    if(!/[^a-zA-Z\d]/.test(password)){
      errors.push('Password must contain at least one special character');
    }

    // Common password check
    if(this.isCommonPassword(password)){
      errors.push('Password is too common. Please choose a stronger password');
    }

    const strength=this.checkPasswordStrength(password);

    return{
      isValid:errors.length===0 && strength.isStrong,
      errors,
      strength
    };
  }

  /**
   * Check if password is in common passwords list
   */
  private static isCommonPassword(password:string):boolean{
    const commonPasswords=[
      'password','123456','12345678','qwerty','abc123','monkey','1234567','letmein',
      'trustno1','dragon','baseball','iloveyou','master','sunshine','ashley','bailey',
      'passw0rd','shadow','123123','654321','superman','qazwsx','michael','football',
      'password1','password123','admin','welcome','login','admin123','root','toor'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Check if password was in a data breach (simplified version)
   * In production, integrate with HaveIBeenPwned API
   */
  static async checkPasswordBreach(_password:string):Promise<boolean>{
    // Hash the password with SHA-1 for HIBP API
    // In production, use prefix/suffix for HIBP API range query
    // const sha1Hash=crypto.createHash('sha1').update(password).digest('hex').toUpperCase();

    try{
      // In production, make actual API call to https://api.pwnedpasswords.com/range/${prefix}
      // For now, return false (not breached) to avoid external dependencies
      // TODO: Implement actual HIBP API integration
      return false;
    }catch(error){
      // If API fails, allow password (don't block user)
      return false;
    }
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length:number=16):string{
    const lowercase='abcdefghijklmnopqrstuvwxyz';
    const uppercase='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers='0123456789';
    const special='!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars=lowercase+uppercase+numbers+special;

    let password='';
    
    // Ensure at least one of each type
    password+=lowercase[crypto.randomInt(lowercase.length)];
    password+=uppercase[crypto.randomInt(uppercase.length)];
    password+=numbers[crypto.randomInt(numbers.length)];
    password+=special[crypto.randomInt(special.length)];

    // Fill rest with random characters
    for(let i=password.length;i<length;i++){
      password+=allChars[crypto.randomInt(allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(()=>crypto.randomInt(3)-1).join('');
  }

  /**
   * Check if password is in user's password history
   */
  static async checkPasswordHistory(password:string,passwordHistory:string[],maxHistory:number=5):Promise<boolean>{
    const recentPasswords=passwordHistory.slice(-maxHistory);
    
    for(const oldHash of recentPasswords){
      if(await this.verifyPassword(password,oldHash)){
        return true; // Password found in history
      }
    }
    
    return false;
  }

  /**
   * Generate password reset token
   */
  static generateResetToken():string{
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash reset token for storage
   */
  static hashResetToken(token:string):string{
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify reset token
   */
  static verifyResetToken(token:string,hashedToken:string):boolean{
    const hash=this.hashResetToken(token);
    return crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(hashedToken));
  }
}

export default PasswordUtils;

