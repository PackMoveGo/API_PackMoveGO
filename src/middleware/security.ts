import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { optionalAuth } from './authMiddleware';

// Enhanced rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 100, // Stricter in production
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for trusted IPs and health checks
  skip: (req) => {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    return req.path === '/api/health' || 
           req.path === '/api/health/simple' || 
           req.path === '/health' ||
           clientIp.startsWith('76.76.21.') ||
           clientIp.startsWith('10.') ||
           clientIp.startsWith('172.') ||
           clientIp.startsWith('192.168.');
  }
});

// API Key validation middleware
const validateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  // Skip API key validation if disabled
  if (process.env.API_KEY_ENABLED !== 'true') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;
  const frontendKey = process.env.API_KEY_FRONTEND;
  const adminKey = process.env.API_KEY_ADMIN;

  // Check if API key is provided
  if (!apiKey) {
    console.warn(`🚫 API key missing from IP: ${req.ip}`);
    return res.status(401).json({
      success: false,
      message: 'API key required',
      error: 'Missing x-api-key header'
    });
  }

  // Validate API key
  if (apiKey === frontendKey) {
    (req as any).apiKeyType = 'frontend';
    console.log(`✅ Valid frontend API key from IP: ${req.ip}`);
    return next();
  }

  if (apiKey === adminKey) {
    (req as any).apiKeyType = 'admin';
    console.log(`✅ Valid admin API key from IP: ${req.ip}`);
    return next();
  }

  console.warn(`🚫 Invalid API key from IP: ${req.ip}`);
  return res.status(401).json({
    success: false,
    message: 'Invalid API key',
    error: 'Unauthorized access'
  });
};

// Enhanced security headers configuration
const securityHeaders = process.env.NODE_ENV === 'development' 
  ? helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      hsts: false,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: false,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true
    })
  : helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: [
            "'self'",
            "https://*.vercel.app",
            "https://pack-go-movers-backend.onrender.com",
            "https://www.packmovego.com",
            "https://packmovego.com",
            "https://api.packmovego.com"
          ],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true
    });

// Simple request validation middleware - Only check for obvious attacks
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Only check for obvious attack patterns in query parameters and body
  const obviousAttackPatterns = [
    /<script>.*<\/script>/i,
    /javascript:/i,
    /eval\s*\(/i,
    /union\s+select/i,
    /\.\.\//i,  // Path traversal
    /\.\.\\/i,  // Path traversal
    /\.env/i,   // Environment file access
    /\.git/i,   // Git directory access
    /php:\/\/|file:\/\/|data:\/\//i, // File inclusion
  ];

  // Only check query parameters and body, not the path
  const queryString = JSON.stringify(req.query);
  const bodyString = JSON.stringify(req.body);

  for (const pattern of obviousAttackPatterns) {
    if (pattern.test(queryString) || pattern.test(bodyString)) {
      console.warn(`🚫 Attack detected from IP: ${req.ip}, Path: ${req.path}`);
      return res.status(403).json({
        success: false,
        message: 'Invalid request detected',
        error: 'Security violation'
      });
    }
  }

  next();
};

// Request size limiter
const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > MAX_REQUEST_SIZE) {
    console.warn(`🚫 Large request detected from IP: ${req.ip}`);
    return res.status(413).json({
      success: false,
      message: 'Request entity too large',
      error: 'Request exceeds size limit'
    });
  }

  next();
};

// Additional security headers
const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent caching of sensitive data
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

// Enhanced security monitoring middleware
const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.socket.remoteAddress || '';
  const userAgent = req.get('User-Agent') || 'Unknown';
  const requestPath = req.path;
  
  // Log suspicious requests
  if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('spider')) {
    console.log(`🤖 Bot detected: ${userAgent} from ${clientIp} accessing ${requestPath}`);
  }
  
  // Log requests to sensitive endpoints
  if (requestPath.includes('admin') || requestPath.includes('config') || requestPath.includes('debug')) {
    console.warn(`⚠️ Sensitive endpoint accessed: ${requestPath} by ${clientIp}`);
  }
  
  // Log API key usage
  if ((req as any).apiKeyType) {
    console.log(`🔑 API key used: ${(req as any).apiKeyType} for ${requestPath}`);
  }
  
  next();
};

// Combine all security middleware
export const securityMiddleware = [
  securityHeaders,
  securityMonitoring,
  apiLimiter,
  validateAPIKey,
  validateRequest,
  requestSizeLimiter,
  additionalSecurityHeaders
];

// Export individual middleware for specific use cases
export { validateAPIKey, validateRequest, requestSizeLimiter, additionalSecurityHeaders }; 