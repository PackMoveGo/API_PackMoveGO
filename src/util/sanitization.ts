/**
 * XSS Sanitization Utility
 * Prevents Cross-Site Scripting attacks
 */

export class SanitizationUtils{
  // HTML entities map
  private static readonly HTML_ENTITIES:Record<string,string>={
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":"&#x27;",
    '/':'&#x2F;'
  };

  /**
   * Escape HTML special characters
   */
  static escapeHtml(str:string):string{
    if(!str||typeof str!=='string')return '';

    return str.replace(/[&<>"'\/]/g,char=>this.HTML_ENTITIES[char]||char);
  }

  /**
   * Remove all HTML tags
   */
  static stripHtmlTags(str:string):string{
    if(!str||typeof str!=='string')return '';

    return str.replace(/<[^>]*>/g,'');
  }

  /**
   * Sanitize string for safe use in HTML
   */
  static sanitizeString(str:string):string{
    if(!str||typeof str!=='string')return '';

    // Remove script tags and their content
    let sanitized=str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,'');

    // Remove event handlers
    sanitized=sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi,'');

    // Remove javascript: protocol
    sanitized=sanitized.replace(/javascript:/gi,'');

    // Remove data: protocol (except for images)
    sanitized=sanitized.replace(/data:(?!image)[^,]*,/gi,'');

    // Escape HTML
    return this.escapeHtml(sanitized);
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj:any):any{
    if(obj===null||obj===undefined)return obj;

    if(Array.isArray(obj)){
      return obj.map(item=>this.sanitizeObject(item));
    }

    if(typeof obj==='object'){
      const sanitized:any={};
      
      for(const key in obj){
        if(typeof obj[key]==='string'){
          sanitized[key]=this.sanitizeString(obj[key]);
        }else{
          sanitized[key]=this.sanitizeObject(obj[key]);
        }
      }

      return sanitized;
    }

    if(typeof obj==='string'){
      return this.sanitizeString(obj);
    }

    return obj;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email:string):boolean{
    if(!email||typeof email!=='string')return false;

    const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length<=254;
  }

  /**
   * Sanitize email
   */
  static sanitizeEmail(email:string):string{
    if(!email||typeof email!=='string')return '';

    return email.toLowerCase().trim().substring(0,254);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url:string):boolean{
    if(!url||typeof url!=='string')return false;

    try{
      const urlObj=new URL(url);
      // Only allow http and https protocols
      return['http:','https:'].includes(urlObj.protocol);
    }catch{
      return false;
    }
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(url:string):string{
    if(!url||typeof url!=='string')return '';

    // Remove javascript: and data: protocols
    if(/^(javascript|data):/i.test(url)){
      return '';
    }

    try{
      const urlObj=new URL(url);
      // Only allow http and https
      if(!['http:','https:'].includes(urlObj.protocol)){
        return '';
      }
      return urlObj.toString();
    }catch{
      return '';
    }
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename:string):string{
    if(!filename||typeof filename!=='string')return '';

    // Remove path traversal attempts
    return filename
      .replace(/\.\./g,'')
      .replace(/[\/\\]/g,'')
      .replace(/[<>:"|?*]/g,'')
      .trim()
      .substring(0,255);
  }

  /**
   * Validate phone number format (US format)
   */
  static isValidPhone(phone:string):boolean{
    if(!phone||typeof phone!=='string')return false;

    // Remove all non-digit characters
    const digits=phone.replace(/\D/g,'');

    // Check if it's a valid US phone number (10 or 11 digits)
    return digits.length===10||(digits.length===11 && digits[0]==='1');
  }

  /**
   * Sanitize phone number
   */
  static sanitizePhone(phone:string):string{
    if(!phone||typeof phone!=='string')return '';

    // Keep only digits, +, -, (, ), and spaces
    return phone.replace(/[^\d\s\-\(\)\+]/g,'').trim();
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJSON(jsonString:string):any{
    try{
      const parsed=JSON.parse(jsonString);
      return this.sanitizeObject(parsed);
    }catch{
      return null;
    }
  }

  /**
   * Remove null bytes
   */
  static removeNullBytes(str:string):string{
    if(!str||typeof str!=='string')return '';

    return str.replace(/\0/g,'');
  }

  /**
   * Normalize whitespace
   */
  static normalizeWhitespace(str:string):string{
    if(!str||typeof str!=='string')return '';

    return str.trim().replace(/\s+/g,' ');
  }

  /**
   * Sanitize for use in SQL LIKE clause (if needed)
   */
  static sanitizeForLike(str:string):string{
    if(!str||typeof str!=='string')return '';

    return str.replace(/[%_\\]/g,'\\$&');
  }

  /**
   * Validate and sanitize integer
   */
  static sanitizeInteger(value:any,min?:number,max?:number):number|null{
    const num=parseInt(value,10);

    if(isNaN(num))return null;
    if(min!==undefined && num<min)return min;
    if(max!==undefined && num>max)return max;

    return num;
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data:string,visibleChars:number=4):string{
    if(!data||typeof data!=='string')return '';
    if(data.length<=visibleChars)return '*'.repeat(data.length);

    return data.substring(0,visibleChars)+'*'.repeat(data.length-visibleChars);
  }

  /**
   * Mask email for logging
   */
  static maskEmail(email:string):string{
    if(!email||typeof email!=='string')return '';

    const[local,domain]=email.split('@');
    if(!local||!domain)return email;

    const maskedLocal=local.length>2?local[0]+'*'.repeat(local.length-2)+local[local.length-1]:local;
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask phone for logging
   */
  static maskPhone(phone:string):string{
    if(!phone||typeof phone!=='string')return '';

    const digits=phone.replace(/\D/g,'');
    if(digits.length<4)return '*'.repeat(phone.length);

    return '*'.repeat(digits.length-4)+digits.slice(-4);
  }
}

export default SanitizationUtils;
