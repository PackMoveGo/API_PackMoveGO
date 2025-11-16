import { Request, Response, NextFunction } from 'express';
import JWTUtils from '../util/jwt-utils';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    phone?: string;
    username?: string;
    role: string;
  };
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const decoded = await JWTUtils.verifyToken(token, true);
    if (decoded) {
      // Verify fingerprint if available
      const userAgent = req.get('User-Agent') || '';
      const ipAddress = req.ip || req.socket.remoteAddress || '';
      
      if (decoded.fingerprint && !JWTUtils.verifyFingerprint(token, userAgent, ipAddress)) {
        res.status(401).json({
          success: false,
          message: 'Token fingerprint mismatch - security violation',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      req.user = decoded;
      next();
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware to require authentication (returns 401 if not authenticated)
 */
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      timestamp: new Date().toISOString()
    });
    return;
  }
  next();
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Middleware to require specific role
 */
export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        success: false,
        message: `Role '${role}' required`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

  if (token) {
    try {
      const decoded = await JWTUtils.verifyToken(token, true);
      if (decoded) {
        req.user = decoded;
      }
      // Silently continue if token is invalid - no need to log every invalid token
    } catch (error) {
      // Silently continue if token is invalid - no need to log every invalid token
    }
  }

  next();
};

export default {
  authenticateToken,
  requireAuth,
  requireAdmin,
  requireRole,
  optionalAuth
}; 