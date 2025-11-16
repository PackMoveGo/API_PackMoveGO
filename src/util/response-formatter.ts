import { Response } from 'express';
import { consoleLogger } from './console-logger';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  requestId?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta?: {
    version: string;
    environment: string;
    processingTime?: number;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  errorCode?: string;
  timestamp: string;
  requestId?: string;
  path?: string;
  method?: string;
  maintenance?: boolean;
  debug?: {
    message: string;
    stack?: string;
    name: string;
  };
}

// Success response formatter
export const sendSuccess = <T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
    options?: {
    requestId?: string;
      pagination?: {
        page: number;
        limit: number;
        total: number;
      };
    processingTime?: number;
    }
) => {
  const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      requestId: options?.requestId,
      meta: {
      version: '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      processingTime: options?.processingTime
      }
    };

    if (options?.pagination) {
      response.pagination = {
      page: options.pagination.page,
      limit: options.pagination.limit,
      total: options.pagination.total,
      totalPages: Math.ceil(options.pagination.total / options.pagination.limit)
    };
  }

  // Log successful response
  consoleLogger.info('api', `Success: ${message}`, {
    statusCode,
    path: res.req.path,
    method: res.req.method,
    requestId: options?.requestId
  });

    res.status(statusCode).json(response);
};

// Error response formatter
export const sendError = (
    res: Response,
    message: string,
    statusCode: number = 500,
  errorCode?: string,
    options?: {
      requestId?: string;
    path?: string;
    method?: string;
    debug?: {
      message: string;
      stack?: string;
      name: string;
    };
    }
) => {
  const response: ErrorResponse = {
      success: false,
      message,
    errorCode,
      timestamp: new Date().toISOString(),
    requestId: options?.requestId,
    path: options?.path,
    method: options?.method
  };

  // Add debug information in development
  if (process.env['NODE_ENV'] === 'development' && options?.debug) {
    response.debug = options.debug;
  }

  // Log error response
  consoleLogger.error('api', `Error: ${message}`, {
    statusCode,
    errorCode,
    path: options?.path,
    method: options?.method,
    requestId: options?.requestId
  });

  res.status(statusCode).json(response);
};

// Pagination helper
export const createPaginationResponse = <T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Data retrieved successfully',
  options?: {
    requestId?: string;
    processingTime?: number;
  }
) => {
  return sendSuccess(res, data, message, 200, {
    requestId: options?.requestId,
    pagination: { page, limit, total },
    processingTime: options?.processingTime
  });
};

// Health check response
export const sendHealthCheck = (res: Response, options?: { requestId?: string }) => {
  const dbStatus = require('../config/database').getConnectionStatus();
  
  const healthData = {
    status: 'ok',
    environment: process.env['NODE_ENV'] || 'development',
    uptime: Math.floor(process.uptime()),
    database: {
      connected: dbStatus,
      status: dbStatus ? 'connected' : 'disconnected'
    },
    services: {
      'MongoDB': dbStatus ? '✅ Connected' : '❌ Not connected',
      'JWT': process.env['JWT_SECRET'] ? '✅ Configured' : '❌ Not configured',
      'Stripe': process.env['STRIPE_SECRET_KEY'] ? '✅ Configured' : '❌ Not configured',
      'Email': process.env['EMAIL_USER'] ? '✅ Configured' : '❌ Not configured'
    }
  };

  return sendSuccess(res, healthData, 'Health check passed', 200, {
    requestId: options?.requestId
  });
};

// Validation error response
export const sendValidationError = (
  res: Response,
  errors: any[],
  message: string = 'Validation failed',
  options?: { requestId?: string }
) => {
  const response: ErrorResponse = {
    success: false,
    message,
    errorCode: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString(),
    requestId: options?.requestId,
    debug: {
      message,
      name: 'ValidationError',
      stack: JSON.stringify(errors, null, 2)
    }
  };

  consoleLogger.warn('api', `Validation Error: ${message}`, {
    errors,
    requestId: options?.requestId
  });

  res.status(400).json(response);
};

// Authentication error response
export const sendAuthError = (
  res: Response,
  message: string = 'Authentication required',
  options?: { requestId?: string }
) => {
  return sendError(res, message, 401, 'AUTHENTICATION_ERROR', options);
};

// Authorization error response
export const sendAuthzError = (
  res: Response,
  message: string = 'Access forbidden',
  options?: { requestId?: string }
) => {
  return sendError(res, message, 403, 'AUTHORIZATION_ERROR', options);
};

// Not found error response
export const sendNotFoundError = (
  res: Response,
  resource: string = 'Resource',
  options?: { requestId?: string }
) => {
  return sendError(res, `${resource} not found`, 404, 'NOT_FOUND', options);
};

// Rate limit error response
export const sendRateLimitError = (
    res: Response,
  retryAfter: number = 60,
  options?: { requestId?: string }
) => {
  res.setHeader('Retry-After', retryAfter.toString());
  return sendError(res, 'Too many requests', 429, 'RATE_LIMIT_EXCEEDED', options);
};

// Database error response
export const sendDatabaseError = (
  res: Response,
  message: string = 'Database service unavailable',
  options?: { requestId?: string }
) => {
  return sendError(res, message, 503, 'DATABASE_ERROR', options);
};

// Maintenance mode response
export const sendMaintenanceResponse = (
    res: Response,
  message: string = 'Site is under maintenance. Please check back soon.',
  options?: { requestId?: string }
) => {
  const response: ErrorResponse = {
    success: false,
    message,
    errorCode: 'MAINTENANCE_MODE',
      timestamp: new Date().toISOString(),
    requestId: options?.requestId,
    maintenance: true
  };

  consoleLogger.info('api', 'Maintenance mode response', {
    message,
    requestId: options?.requestId
  });

  res.status(503).json(response);
};

// Timeout error response
export const sendTimeoutError = (
  res: Response,
  options?: { requestId?: string }
) => {
  return sendError(res, 'Request timeout', 408, 'TIMEOUT', options);
};

// Export default formatter
export default {
  sendSuccess,
  sendError,
  createPaginationResponse,
  sendHealthCheck,
  sendValidationError,
  sendAuthError,
  sendAuthzError,
  sendNotFoundError,
  sendRateLimitError,
  sendDatabaseError,
  sendMaintenanceResponse,
  sendTimeoutError
}; 