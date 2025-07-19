import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ipWhitelist, SECURITY_CONFIG } from './ipWhitelist';
import { authMiddleware } from './authMiddleware';

// Rate limiting configuration - stricter for production
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 100, // Stricter in production
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for trusted IPs
  skip: (req) => {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    // Skip rate limiting for health checks and trusted IPs
    return req.path === '/api/health' || 
           req.path === '/api/health/simple' || 
           req.path === '/health' ||
           clientIp.startsWith('76.76.21.') ||
           clientIp.startsWith('10.') ||
           clientIp.startsWith('172.') ||
           clientIp.startsWith('192.168.');
  }
});

// Security headers configuration
const securityHeaders = process.env.NODE_ENV === 'development' 
  ? helmet({
      contentSecurityPolicy: false, // Disable CSP in development
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      hsts: false, // Disable HSTS in development
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

// Request validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Check for common attack patterns
  const attackPatterns = [
    /<script>.*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
    /alert\s*\(/i,
    /union\s+select/i,
    /exec\s*\(/i,
    /system\s*\(/i,
    /\.\.\//i,  // Path traversal
    /\.\.\\/i,  // Path traversal
    /\.env/i,   // Environment file access
    /\.git/i,   // Git directory access
    /\.config/i, // Config file access
    /\.ini/i,   // INI file access
    /\.log/i    // Log file access
  ];

  const requestBody = JSON.stringify(req.body);
  const requestQuery = JSON.stringify(req.query);
  const requestParams = JSON.stringify(req.params);
  const requestPath = req.path;
  const requestHeaders = JSON.stringify(req.headers);

  const combinedRequest = `${requestBody}${requestQuery}${requestParams}${requestPath}${requestHeaders}`;

  for (const pattern of attackPatterns) {
    if (pattern.test(combinedRequest)) {
      console.warn(`🚫 Attack detected from IP: ${req.ip}, Path: ${requestPath}`);
      return res.status(403).json({
        success: false,
        message: 'Invalid request detected'
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
      message: 'Request entity too large'
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

// Security monitoring middleware
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
  
  next();
};

// Combine all security middleware
export const securityMiddleware = [
  securityHeaders,
  securityMonitoring,
  authMiddleware, // Use new authentication middleware
  apiLimiter,
  validateRequest,
  requestSizeLimiter,
  additionalSecurityHeaders
];

// Export security configuration
export { SECURITY_CONFIG }; 