/**
 * Custom Error Classes for Standardized Error Handling
 */

export enum ErrorCode{
  // Authentication Errors (1000-1099)
  AUTH_TOKEN_MISSING='AUTH_1000',
  AUTH_TOKEN_INVALID='AUTH_1001',
  AUTH_TOKEN_EXPIRED='AUTH_1002',
  AUTH_CREDENTIALS_INVALID='AUTH_1003',
  AUTH_ACCOUNT_LOCKED='AUTH_1004',
  AUTH_MFA_REQUIRED='AUTH_1005',
  AUTH_MFA_INVALID='AUTH_1006',

  // Authorization Errors (1100-1199)
  AUTHZ_PERMISSION_DENIED='AUTHZ_1100',
  AUTHZ_ROLE_REQUIRED='AUTHZ_1101',
  AUTHZ_RESOURCE_FORBIDDEN='AUTHZ_1102',
  AUTHZ_OWNERSHIP_REQUIRED='AUTHZ_1103',

  // Validation Errors (1200-1299)
  VALIDATION_FAILED='VAL_1200',
  VALIDATION_FIELD_REQUIRED='VAL_1201',
  VALIDATION_FIELD_INVALID='VAL_1202',
  VALIDATION_FIELD_TOO_LONG='VAL_1203',
  VALIDATION_FIELD_TOO_SHORT='VAL_1204',

  // Resource Errors (1300-1399)
  RESOURCE_NOT_FOUND='RES_1300',
  RESOURCE_ALREADY_EXISTS='RES_1301',
  RESOURCE_CONFLICT='RES_1302',
  RESOURCE_DELETED='RES_1303',

  // Database Errors (1400-1499)
  DB_CONNECTION_FAILED='DB_1400',
  DB_QUERY_FAILED='DB_1401',
  DB_TRANSACTION_FAILED='DB_1402',
  DB_CONSTRAINT_VIOLATION='DB_1403',

  // Rate Limiting (1500-1599)
  RATE_LIMIT_EXCEEDED='RATE_1500',
  RATE_LIMIT_BURST='RATE_1501',

  // Security Errors (1600-1699)
  SECURITY_CSRF_INVALID='SEC_1600',
  SECURITY_XSS_DETECTED='SEC_1601',
  SECURITY_INJECTION_DETECTED='SEC_1602',
  SECURITY_SUSPICIOUS_ACTIVITY='SEC_1603',

  // Payment Errors (1700-1799)
  PAYMENT_FAILED='PAY_1700',
  PAYMENT_DECLINED='PAY_1701',
  PAYMENT_INSUFFICIENT_FUNDS='PAY_1702',
  PAYMENT_INVALID_CARD='PAY_1703',

  // Generic Errors (1900-1999)
  INTERNAL_SERVER_ERROR='ERR_1900',
  SERVICE_UNAVAILABLE='ERR_1901',
  BAD_REQUEST='ERR_1902',
  TIMEOUT='ERR_1903'
}

export interface ErrorResponse{
  success:false;
  error:string;
  message:string;
  code:ErrorCode;
  statusCode:number;
  details?:any;
  timestamp:string;
  requestId?:string;
}

/**
 * Base Application Error
 */
export class AppError extends Error{
  public readonly code:ErrorCode;
  public readonly statusCode:number;
  public readonly details?:any;
  public readonly isOperational:boolean;

  constructor(message:string,code:ErrorCode,statusCode:number,details?:any,isOperational:boolean=true){
    super(message);
    this.code=code;
    this.statusCode=statusCode;
    this.details=details;
    this.isOperational=isOperational;
    
    Error.captureStackTrace(this,this.constructor);
    Object.setPrototypeOf(this,AppError.prototype);
  }

  toJSON():ErrorResponse{
    return{
      success:false,
      error:this.name,
      message:this.message,
      code:this.code,
      statusCode:this.statusCode,
      details:this.details,
      timestamp:new Date().toISOString()
    };
  }
}

/**
 * Authentication Errors
 */
export class AuthenticationError extends AppError{
  constructor(message:string='Authentication failed',code:ErrorCode=ErrorCode.AUTH_TOKEN_INVALID,details?:any){
    super(message,code,401,details);
    this.name='AuthenticationError';
  }
}

/**
 * Authorization Errors
 */
export class AuthorizationError extends AppError{
  constructor(message:string='Insufficient permissions',code:ErrorCode=ErrorCode.AUTHZ_PERMISSION_DENIED,details?:any){
    super(message,code,403,details);
    this.name='AuthorizationError';
  }
}

/**
 * Validation Errors
 */
export class ValidationError extends AppError{
  constructor(message:string='Validation failed',details?:any,code:ErrorCode=ErrorCode.VALIDATION_FAILED){
    super(message,code,400,details);
    this.name='ValidationError';
  }
}

/**
 * Resource Not Found Errors
 */
export class NotFoundError extends AppError{
  constructor(resource:string='Resource',code:ErrorCode=ErrorCode.RESOURCE_NOT_FOUND){
    super(`${resource} not found`,code,404);
    this.name='NotFoundError';
  }
}

/**
 * Conflict Errors
 */
export class ConflictError extends AppError{
  constructor(message:string='Resource conflict',code:ErrorCode=ErrorCode.RESOURCE_CONFLICT,details?:any){
    super(message,code,409,details);
    this.name='ConflictError';
  }
}

/**
 * Rate Limit Errors
 */
export class RateLimitError extends AppError{
  constructor(message:string='Rate limit exceeded',code:ErrorCode=ErrorCode.RATE_LIMIT_EXCEEDED,details?:any){
    super(message,code,429,details);
    this.name='RateLimitError';
  }
}

/**
 * Database Errors
 */
export class DatabaseError extends AppError{
  constructor(message:string='Database error',code:ErrorCode=ErrorCode.DB_QUERY_FAILED,details?:any){
    super(message,code,503,details,false);
    this.name='DatabaseError';
  }
}

/**
 * Security Errors
 */
export class SecurityError extends AppError{
  constructor(message:string='Security violation detected',code:ErrorCode=ErrorCode.SECURITY_SUSPICIOUS_ACTIVITY,details?:any){
    super(message,code,403,details);
    this.name='SecurityError';
  }
}

/**
 * Payment Errors
 */
export class PaymentError extends AppError{
  constructor(message:string='Payment failed',code:ErrorCode=ErrorCode.PAYMENT_FAILED,details?:any){
    super(message,code,402,details);
    this.name='PaymentError';
  }
}

/**
 * Error Factory for easy error creation
 */
export class ErrorFactory{
  static authentication(message?:string,code?:ErrorCode,details?:any):AuthenticationError{
    return new AuthenticationError(message,code,details);
  }

  static authorization(message?:string,code?:ErrorCode,details?:any):AuthorizationError{
    return new AuthorizationError(message,code,details);
  }

  static validation(message?:string,details?:any,code?:ErrorCode):ValidationError{
    return new ValidationError(message,details,code);
  }

  static notFound(resource?:string,code?:ErrorCode):NotFoundError{
    return new NotFoundError(resource,code);
  }

  static conflict(message?:string,code?:ErrorCode,details?:any):ConflictError{
    return new ConflictError(message,code,details);
  }

  static rateLimit(message?:string,code?:ErrorCode,details?:any):RateLimitError{
    return new RateLimitError(message,code,details);
  }

  static database(message?:string,code?:ErrorCode,details?:any):DatabaseError{
    return new DatabaseError(message,code,details);
  }

  static security(message?:string,code?:ErrorCode,details?:any):SecurityError{
    return new SecurityError(message,code,details);
  }

  static payment(message?:string,code?:ErrorCode,details?:any):PaymentError{
    return new PaymentError(message,code,details);
  }
}

// All classes are already exported above, no need for re-export

