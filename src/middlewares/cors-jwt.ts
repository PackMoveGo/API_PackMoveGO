import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JWTCorsConfig {
  jwtSecret: string;
  allowedOrigins: string[];
  publicEndpoints: string[];
  optionalAuthEndpoints: string[];
}

export class CORSJWTMiddleware {
  private config: JWTCorsConfig;

  constructor(config: JWTCorsConfig) {
    this.config = config;
  }

  /**
   * Validate JWT token from Authorization header or cookie
   */
  private validateJWT(req: Request): { valid: boolean; payload?: any; error?: string } {
    try {
      // Check Authorization header first
      const authHeader = req.headers.authorization;
      let token: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (authHeader && !authHeader.startsWith('Bearer ')) {
        // Handle case where token is sent without 'Bearer ' prefix
        token = authHeader;
      } else {
        // Check for JWT in cookies
        token = req.cookies?.jwt_token || req.cookies?.auth_token || req.cookies?.token;
      }

      // Also check query parameters for token (useful for some frontend frameworks)
      if (!token && req.query.token) {
        token = req.query.token as string;
      }

      if (!token) {
        return { valid: false, error: 'No JWT token provided' };
      }

      // Verify the token
      const payload = jwt.verify(token, this.config.jwtSecret) as any;
      return { valid: true, payload };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid JWT token' 
      };
    }
  }

  /**
   * Check if endpoint is public (no auth required)
   */
  private isPublicEndpoint(path: string): boolean {
    return this.config.publicEndpoints.some(endpoint => 
      path.startsWith(endpoint) || path === endpoint
    );
  }

  /**
   * Check if endpoint allows optional auth
   */
  private isOptionalAuthEndpoint(path: string): boolean {
    return this.config.optionalAuthEndpoints.some(endpoint => 
      path.startsWith(endpoint) || path === endpoint
    );
  }

  /**
   * Main CORS JWT middleware
   */
  public middleware = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const method = req.method;
    const path = req.path;

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return this.handlePreflight(req, res, next);
    }

    // Handle actual requests
    return this.handleRequest(req, res, next);
  };

  /**
   * Handle CORS preflight requests with JWT validation
   */
  private handlePreflight(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin;
    const path = req.path;

    // Allow requests with no origin (like direct API calls, server-to-server)
    if (!origin) {
      console.log(`🌐 CORS Preflight: No origin -> ${path} (ALLOWED)`);
      this.setCORSHeaders(req, res, '*');
      return res.status(200).end();
    }

    // Check if origin is allowed
    if (!this.isOriginAllowed(origin)) {
      return res.status(403).json({
        success: false,
        error: 'CORS: Origin not allowed',
        message: 'Cross-origin request not permitted',
        timestamp: new Date().toISOString()
      });
    }

    // For public endpoints, allow without JWT
    if (this.isPublicEndpoint(path)) {
      this.setCORSHeaders(req, res, origin);
      return res.status(200).end();
    }

    // For optional auth endpoints, allow with or without JWT
    if (this.isOptionalAuthEndpoint(path)) {
      this.setCORSHeaders(req, res, origin);
      return res.status(200).end();
    }

    // For protected endpoints, validate JWT
    const jwtResult = this.validateJWT(req);
    
    if (!jwtResult.valid) {
      return res.status(401).json({
        success: false,
        error: 'CORS: Authentication required',
        message: jwtResult.error || 'JWT token required for this endpoint',
        timestamp: new Date().toISOString(),
        path: path,
        origin: origin
      });
    }

    this.setCORSHeaders(req, res, origin);
    return res.status(200).end();
  }

  /**
   * Handle actual requests with JWT validation
   */
  private handleRequest(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin;
    const path = req.path;

    // Debug logging for CORS issues (only for blocked requests)
    if (origin && !this.isOriginAllowed(origin)) {
      console.log(`🌐 CORS Request: ${origin} -> ${path}`);
      console.log(`🔍 Allowed origins:`, this.config.allowedOrigins);
      console.log(`❌ Origin blocked:`, origin);
    }

    // Allow requests with no origin (like direct API calls, server-to-server)
    if (!origin) {
      this.setCORSHeaders(req, res, '*');
      return next();
    }

    // Check if origin is allowed
    if (!this.isOriginAllowed(origin)) {
      console.log(`❌ CORS blocked: ${origin} for ${path}`);
      return res.status(403).json({
        success: false,
        error: 'CORS: Origin not allowed',
        message: 'Cross-origin request not permitted',
        timestamp: new Date().toISOString(),
        origin: origin,
        path: path
      });
    }

    // For public endpoints, allow without JWT
    if (this.isPublicEndpoint(path)) {
      this.setCORSHeaders(req, res, origin);
      return next();
    }

    // For optional auth endpoints, allow with or without JWT
    if (this.isOptionalAuthEndpoint(path)) {
      this.setCORSHeaders(req, res, origin);
      return next();
    }

    // For protected endpoints, validate JWT
    const jwtResult = this.validateJWT(req);
    
    if (!jwtResult.valid) {
      return res.status(401).json({
        success: false,
        error: 'CORS: Authentication required',
        message: jwtResult.error || 'JWT token required for this endpoint',
        timestamp: new Date().toISOString(),
        path: path,
        origin: origin
      });
    }

    this.setCORSHeaders(req, res, origin);
    
    // Add JWT payload to request for downstream middleware
    (req as any).jwtPayload = jwtResult.payload;
    
    return next();
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return true;
    }
    
    // Allow IP addresses for testing
    if (origin.match(/^https?:\/\/\d+\.\d+\.\d+\.\d+/)) {
      return true;
    }
    
    // Allow all origins if * is in the list
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }
    
    // Check exact match
    if (this.config.allowedOrigins.includes(origin)) {
      return true;
    }
    
    // Check wildcard patterns
    return this.config.allowedOrigins.some(allowed => 
      allowed.startsWith('https://*.') && origin.endsWith(allowed.substring(8))
    );
  }

  /**
   * Set CORS headers
   */
  private setCORSHeaders(req: Request, res: Response, origin: string) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
  }
}

// Export factory function for easy configuration
export const createCORSJWT = (config: JWTCorsConfig) => {
  return new CORSJWTMiddleware(config);
}; 