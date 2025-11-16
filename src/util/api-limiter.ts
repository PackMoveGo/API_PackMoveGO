import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Enhanced rate limiting based on authentication type
export const createAdvancedRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    
    // Dynamic limit based on authentication
    max: (req: Request) => {
      const apiKey = (Array.isArray(req.headers['x-api-key']) ? req.headers['x-api-key'][0] : req.headers['x-api-key']) || 
                     req.headers['authorization']?.replace('Bearer ', '');
      
      // Admin gets highest limits
      if (apiKey === process.env['API_KEY_ADMIN']) {
        return 1000; // 1000 requests per 15 minutes
      }
      
      // Frontend API key gets high limits
      if (apiKey === process.env['API_KEY_FRONTEND']) {
        return 2000; // 2000 requests per 15 minutes
      }
      
      // IP whitelisted gets medium limits
      const forwardedFor = req.headers['x-forwarded-for']?.toString();
      const firstIp = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null;
      let clientIp = firstIp || 
                     req.headers['x-real-ip']?.toString() || 
                     req.headers['cf-connecting-ip']?.toString() ||
                     req.headers['x-client-ip']?.toString() ||
                     req.socket.remoteAddress || '';
      
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
      }
      
      // Check if IP is whitelisted
      const whitelistedIPs = process.env['WHITELISTED_IPS']?.split(',') || [];
      if (whitelistedIPs.includes(clientIp)) {
        return 1000; // 1000 requests per 15 minutes for whitelisted IPs
      }
      
      // Default for other requests
      return 100; // 100 requests per 15 minutes
    },
    
    message: (req: Request) => {
      const apiKey = (Array.isArray(req.headers['x-api-key']) ? req.headers['x-api-key'][0] : req.headers['x-api-key']) || 
                     req.headers['authorization']?.replace('Bearer ', '');
      
      let userType = 'Guest';
      if (apiKey === process.env['API_KEY_ADMIN']) userType = 'Admin';
      else if (apiKey === process.env['API_KEY_FRONTEND']) userType = 'Frontend';
      else if (apiKey) userType = 'API User';
      
      // Check if IP is whitelisted
      const whitelistedIPs = process.env['WHITELISTED_IPS']?.split(',') || [];
      const forwardedFor = req.headers['x-forwarded-for']?.toString();
      const firstIp = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null;
      let clientIp = firstIp || 
                     req.headers['x-real-ip']?.toString() || 
                     req.headers['cf-connecting-ip']?.toString() ||
                     req.headers['x-client-ip']?.toString() ||
                     req.socket.remoteAddress || '';
      
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
      }
      
      if (whitelistedIPs.includes(clientIp)) {
        userType = 'Whitelisted IP';
      }
      
      return {
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests from ${userType}. Please try again later.`,
        retryAfter: '15 minutes',
        limits: {
          admin: '1000/15min',
          frontend: '500/15min',
          whitelisted: '1000/15min',
          default: '100/15min'
        },
        timestamp: new Date().toISOString()
      };
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    // Skip rate limiting for health checks and public content endpoints
    skip: (req: Request) => {
      // Always skip for v0 endpoints (public content)
      if (req.path.startsWith('/v0/')) {
        return true;
      }
      
      // Skip for health checks
      if (req.path === '/api/health' || 
          req.path === '/health' || 
          req.path === '/api/health/simple') {
        return true;
      }
      
      // Skip for whitelisted IPs
      const whitelistedIPs = process.env['WHITELISTED_IPS']?.split(',') || [];
      const forwardedFor = req.headers['x-forwarded-for']?.toString();
      const firstIp = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null;
      let clientIp = firstIp || 
                     req.headers['x-real-ip']?.toString() || 
                     req.headers['cf-connecting-ip']?.toString() ||
                     req.headers['x-client-ip']?.toString() ||
                     req.socket.remoteAddress || '';
      
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
      }
      
      return whitelistedIPs.includes(clientIp);
    },
    
    // Custom key generator for better tracking
    keyGenerator: (req: Request) => {
      const apiKey = (Array.isArray(req.headers['x-api-key']) ? req.headers['x-api-key'][0] : req.headers['x-api-key']) || 
                     req.headers['authorization']?.replace('Bearer ', '');
      
      if (apiKey) {
        return `api_${apiKey.substring(0, 8)}...`; // Use first 8 chars of API key
      }
      
      // Use IP for non-API key requests
      const forwardedFor = req.headers['x-forwarded-for']?.toString();
      const firstIp = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null;
      let clientIp = firstIp || 
                     req.headers['x-real-ip']?.toString() || 
                     req.ip || 
                     req.socket.remoteAddress || 
                     'unknown';
      
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
      }
      
      return `ip_${clientIp}`;
    },
    
    // Enhanced handler for when limit is reached
    handler: (req: Request, res: Response) => {
      const resetTime = new Date(Date.now() + 15 * 60 * 1000);
      
      console.warn(`🚫 Rate limit exceeded for ${req.ip} on ${req.path}`);
      
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests, please slow down',
        resetTime: resetTime.toISOString(),
        retryAfter: 900, // 15 minutes in seconds
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Burst protection for high-frequency requests
export const burstProtection = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute burst
  message: {
    success: false,
    error: 'Burst limit exceeded',
    message: 'Too many requests in short time. Please wait a moment.',
    retryAfter: '1 minute',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Always skip for v0 endpoints (public content)
    if (req.path.startsWith('/v0/')) {
      return true;
    }
    
    // Skip for health checks
    if (req.path === '/api/health' || 
        req.path === '/health' || 
        req.path === '/api/health/simple') {
      return true;
    }
    
    // Skip for whitelisted IPs
    const whitelistedIPs = process.env['WHITELISTED_IPS']?.split(',') || [];
    const forwardedFor = req.headers['x-forwarded-for']?.toString();
    const firstIp = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null;
    let clientIp = firstIp || 
                   req.headers['x-real-ip']?.toString() || 
                   req.headers['cf-connecting-ip']?.toString() ||
                   req.headers['x-client-ip']?.toString() ||
                   req.socket.remoteAddress || '';
    
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }
    
    return whitelistedIPs.includes(clientIp);
  }
});

// Export configured limiters
export const advancedRateLimiter = createAdvancedRateLimiter(); 