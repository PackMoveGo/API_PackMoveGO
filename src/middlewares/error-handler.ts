import { Request, Response, NextFunction } from 'express';
import { consoleLogger } from '../util/console-logger';

// Custom error classes for better error handling
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database service unavailable') {
    super(message, 503);
  }
}

// Request ID middleware for tracking requests
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

// Main error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId || 'unknown';
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  // Log the error
  consoleLogger.error('error-handler', 'Server Error', {
    requestId,
    clientIp,
    userAgent,
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  // Determine status code and message
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorCode: string | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized access';
    errorCode = 'AUTHENTICATION_ERROR';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access forbidden';
    errorCode = 'AUTHORIZATION_ERROR';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
    errorCode = 'NOT_FOUND';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    message = 'Resource conflict';
    errorCode = 'CONFLICT_ERROR';
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too many requests';
    errorCode = 'RATE_LIMIT_EXCEEDED';
  } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
    statusCode = 503;
    message = 'Database service unavailable';
    errorCode = 'DATABASE_ERROR';
  } else if (err.name === 'SyntaxError') {
    statusCode = 400;
    message = 'Invalid request format';
    errorCode = 'INVALID_REQUEST';
  } else if (err.name === 'TypeError') {
    statusCode = 400;
    message = 'Invalid data type';
    errorCode = 'TYPE_ERROR';
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    path: req.path,
    method: req.method
  };

  // Add error code if available
  if (errorCode) {
    errorResponse.errorCode = errorCode;
  }

  // Add detailed error information in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      message: err.message,
    stack: err.stack,
    name: err.name
    };
  }

  // Add rate limit information if applicable
  if (statusCode === 429) {
    errorResponse.retryAfter = 60; // 1 minute
    res.setHeader('Retry-After', '60');
  }

  // Set appropriate headers
  res.setHeader('Content-Type', 'application/json');
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = (req as any).requestId || 'unknown';
  
  consoleLogger.warn('error-handler', 'Route not found', {
    requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    requestId,
    availableEndpoints: [
      'health',
      '/v0/blog',
      '/v0/about',
      '/v0/nav',
      '/v0/contact',
      '/v0/referral',
      '/v0/reviews',
      '/v0/locations',
      '/v0/supplies',
      '/v0/services',
      '/v0/testimonials',
      'signup',
      'security',
      'prelaunch'
    ]
  });
};

// Maintenance mode middleware
export const maintenanceModeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE || 'Site is under maintenance. Please check back soon.';
  
  if (maintenanceMode && !req.path.startsWith('/health')) {
    return res.status(503).json({
      success: false,
      message: maintenanceMessage,
      timestamp: new Date().toISOString(),
      maintenance: true
    });
  }
  
  next();
};

// Request timeout middleware
export const timeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        consoleLogger.warn('timeout', `Request timeout for ${req.method} ${req.path}`);
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

 