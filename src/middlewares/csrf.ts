import{Request,Response,NextFunction} from 'express';
import crypto from 'crypto';

export interface CSRFRequest extends Request{
  csrfToken?:string;
}

/**
 * CSRF Token Management
 */
export class CSRFProtection{
  private static readonly TOKEN_SECRET=process.env['CSRF_SECRET']||'default-csrf-secret-change-in-production';
  private static readonly TOKEN_EXPIRY=3600000; // 1 hour

  /**
   * Generate CSRF token
   */
  static generateToken():string{
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create token signature
   */
  private static createSignature(token:string,timestamp:number):string{
    const data=`${token}:${timestamp}`;
    return crypto.createHmac('sha256',this.TOKEN_SECRET).update(data).digest('hex');
  }

  /**
   * Encode token with signature and timestamp
   */
  static encodeToken(token:string):string{
    const timestamp=Date.now();
    const signature=this.createSignature(token,timestamp);
    return `${token}:${timestamp}:${signature}`;
  }

  /**
   * Decode and verify token
   */
  static verifyToken(encodedToken:string):boolean{
    try{
      const parts=encodedToken.split(':');
      if(parts.length!==3)return false;

      const[token,timestampStr,signature]=parts;
      if(!token||!timestampStr||!signature)return false;
      const timestamp=parseInt(timestampStr,10);

      // Check if token is expired
      if(Date.now()-timestamp>this.TOKEN_EXPIRY)return false;

      // Verify signature
      const expectedSignature=this.createSignature(token,timestamp);
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    }catch{
      return false;
    }
  }

  /**
   * Verify token from double-submit cookie pattern
   */
  static verifyDoubleSubmit(tokenFromHeader:string,tokenFromCookie:string):boolean{
    if(!tokenFromHeader||!tokenFromCookie)return false;

    try{
      return crypto.timingSafeEqual(
        Buffer.from(tokenFromHeader || ''),
        Buffer.from(tokenFromCookie || '')
      );
    }catch{
      return false;
    }
  }
}

/**
 * Middleware to generate and attach CSRF token
 */
export const generateCSRFToken=(req:CSRFRequest,res:Response,next:NextFunction):void=>{
  const token=CSRFProtection.generateToken();
  const encodedToken=CSRFProtection.encodeToken(token);

  // Store in cookie
  res.cookie('csrf-token',encodedToken,{
    httpOnly:true,
    secure:process.env['NODE_ENV']==='production',
    sameSite:'strict',
    maxAge:3600000 // 1 hour
  });

  // Also provide in response header for client to use
  res.setHeader('X-CSRF-Token',encodedToken);

  req.csrfToken=encodedToken;
  next();
};

/**
 * Middleware to verify CSRF token for state-changing operations
 */
export const verifyCSRFToken=(req:Request,res:Response,next:NextFunction):void=>{
  // Skip for safe methods
  if(['GET','HEAD','OPTIONS'].includes(req.method)){
    return next();
  }

  // Get token from header
  const tokenFromHeader=req.headers['x-csrf-token'] as string || req.body?._csrf;

  // Get token from cookie (double-submit pattern)
  const tokenFromCookie=req.cookies['csrf-token'];

  // Verify using double-submit pattern
  if(!tokenFromHeader||!tokenFromCookie){
    res.status(403).json({
      success:false,
      message:'CSRF token missing',
      error:'CSRF_TOKEN_MISSING',
      timestamp:new Date().toISOString()
    });
    return;
  }

  // Verify both tokens match and are valid
  const tokensMatch=CSRFProtection.verifyDoubleSubmit(tokenFromHeader,tokenFromCookie);
  const tokenValid=CSRFProtection.verifyToken(tokenFromCookie);

  if(!tokensMatch||!tokenValid){
    res.status(403).json({
      success:false,
      message:'Invalid or expired CSRF token',
      error:'CSRF_TOKEN_INVALID',
      timestamp:new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Middleware to verify origin/referer for additional CSRF protection
 */
export const verifyOrigin=(req:Request,res:Response,next:NextFunction):void=>{
  // Skip for safe methods
  if(['GET','HEAD','OPTIONS'].includes(req.method)){
    return next();
  }

  const origin=req.get('origin');
  const referer=req.get('referer');
  const host=req.get('host');

  // Get allowed origins from env
  const allowedOrigins=process.env['CORS_ORIGINS']?.split(',').map(o=>o.trim())||[];
  const allowedHosts=[host,...allowedOrigins.map(o=>new URL(o).host)];

  // Check origin
  if(origin){
    try{
      const originHost=new URL(origin).host;
      if(!allowedHosts.includes(originHost)){
        res.status(403).json({
          success:false,
          message:'Origin not allowed',
          error:'ORIGIN_NOT_ALLOWED',
          timestamp:new Date().toISOString()
        });
        return;
      }
    }catch{
      res.status(403).json({
        success:false,
        message:'Invalid origin',
        error:'INVALID_ORIGIN',
        timestamp:new Date().toISOString()
      });
      return;
    }
  }

  // Check referer as fallback
  if(!origin && referer){
    try{
      const refererHost=new URL(referer).host;
      if(!allowedHosts.includes(refererHost)){
        res.status(403).json({
          success:false,
          message:'Referer not allowed',
          error:'REFERER_NOT_ALLOWED',
          timestamp:new Date().toISOString()
        });
        return;
      }
    }catch{
      res.status(403).json({
        success:false,
        message:'Invalid referer',
        error:'INVALID_REFERER',
        timestamp:new Date().toISOString()
      });
      return;
    }
  }

  next();
};

export default{
  generateCSRFToken,
  verifyCSRFToken,
  verifyOrigin
};

