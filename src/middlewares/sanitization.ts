import{Request,Response,NextFunction} from 'express';
import SanitizationUtils from '../util/sanitization';
import QuerySanitizer from '../util/query-sanitizer';

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody=(req:Request,_res:Response,next:NextFunction):void=>{
  if(req.body && typeof req.body==='object'){
    req.body=SanitizationUtils.sanitizeObject(req.body);
  }
  next();
};

/**
 * Middleware to sanitize query parameters
 */
export const sanitizeQuery=(req:Request,_res:Response,next:NextFunction):void=>{
  if(req.query && typeof req.query==='object'){
    req.query=QuerySanitizer.sanitizeQuery(req.query);
  }
  next();
};

/**
 * Middleware to sanitize all request inputs
 */
export const sanitizeAll=(req:Request,_res:Response,next:NextFunction):void=>{
  // Sanitize body
  if(req.body && typeof req.body==='object'){
    req.body=SanitizationUtils.sanitizeObject(req.body);
    req.body=QuerySanitizer.sanitizeQuery(req.body);
  }

  // Sanitize query
  if(req.query && typeof req.query==='object'){
    req.query=QuerySanitizer.sanitizeQuery(req.query);
  }

  // Sanitize params
  if(req.params && typeof req.params==='object'){
    req.params=QuerySanitizer.sanitizeQuery(req.params);
  }

  next();
};

/**
 * Middleware to prevent NoSQL injection
 */
export const preventNoSQLInjection=(req:Request,res:Response,next:NextFunction):void=>{
  // Check body for dangerous operators
  if(req.body && !QuerySanitizer.isClean(req.body)){
    res.status(400).json({
      success:false,
      message:'Invalid request: Contains forbidden operators',
      timestamp:new Date().toISOString()
    });
    return;
  }

  // Check query for dangerous operators
  if(req.query && !QuerySanitizer.isClean(req.query)){
    res.status(400).json({
      success:false,
      message:'Invalid request: Contains forbidden operators',
      timestamp:new Date().toISOString()
    });
    return;
  }

  next();
};

export default{
  sanitizeBody,
  sanitizeQuery,
  sanitizeAll,
  preventNoSQLInjection
};

