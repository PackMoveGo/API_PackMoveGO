import { Request, Response, NextFunction } from 'express';

// Helper function to extract client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  const socketIp = req.socket.remoteAddress;
  
  return forwarded?.split(',')[0] || realIp || socketIp || 'Unknown';
}

// Frontend validation middleware - ensures only your frontend can access the backend
export function frontendValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req);
  const requestPath = req.path;
  const method = req.method;
  const origin = req.headers.origin;
  const apiKey = req.headers['x-api-key'] as string;
  const clientCookie = req.cookies?.app_client;
  
  console.log(`🔐 Frontend validation for ${method} ${requestPath} from ${clientIp}`);
  console.log(`   Origin: ${origin || 'None'}`);
  console.log(`   API Key: ${apiKey ? 'Present' : 'Missing'}`);
  console.log(`   Cookie: ${clientCookie || 'Missing'}`);
  
  // Always allow OPTIONS requests for CORS preflight
  if (method === 'OPTIONS') {
    console.log(`✅ Allowing OPTIONS request for CORS preflight`);
    return next();
  }
  
  // Always allow health checks
  if (requestPath === '/api/health' || requestPath === '/health' || requestPath === '/api/health/simple') {
    console.log(`✅ Health check endpoint - allowing`);
    return next();
  }
  
  // Allow /v0/ endpoints (public data) but still log for monitoring
  if (requestPath.startsWith('/v0/')) {
    console.log(`✅ Public /v0/ endpoint - allowing`);
    return next();
  }
  
  // Allow root endpoint
  if (requestPath === '/' || requestPath === '/api') {
    console.log(`✅ Root endpoint - allowing`);
    return next();
  }
  
  // For all other endpoints, apply strict frontend validation
  return validateFrontendAccess(req, res, next);
}

// Strict frontend access validation
function validateFrontendAccess(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req);
  const origin = req.headers.origin;
  const apiKey = req.headers['x-api-key'] as string;
  const clientCookie = req.cookies?.app_client;
  const requestPath = req.path;
  
  // Check if API key validation is enabled
  if (process.env['API_KEY_ENABLED'] === 'true') {
    // Validate API key
    if (!apiKey) {
      console.log(`❌ API key missing for ${requestPath} from ${clientIp}`);
      return res.status(401).json({
        success: false,
        message: 'API key required',
        error: 'Missing x-api-key header',
        timestamp: new Date().toISOString()
      });
    }
    
    const validFrontendKey = process.env['API_KEY_FRONTEND'];
    const validAdminKey = process.env['API_KEY_ADMIN'];
    
    if (!validFrontendKey && !validAdminKey) {
      console.log(`⚠️ No API keys configured in environment`);
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if it's a valid API key
    if (apiKey !== validFrontendKey && apiKey !== validAdminKey) {
      console.log(`❌ Invalid API key for ${requestPath} from ${clientIp}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        timestamp: new Date().toISOString()
      });
    }
    
    // Log which type of key was used
    const keyType = apiKey === validFrontendKey ? 'frontend' : 'admin';
    console.log(`✅ Valid ${keyType} API key for ${requestPath}`);
  }
  
  // Validate frontend cookie
  if (!clientCookie || clientCookie !== 'frontend_app') {
    console.log(`❌ Invalid or missing frontend cookie for ${requestPath} from ${clientIp}`);
    return res.status(403).json({
      success: false,
      message: 'Invalid frontend authentication',
      error: 'Missing or invalid frontend cookie',
      timestamp: new Date().toISOString()
    });
  }
  
  // Validate origin in production
  if (process.env['NODE_ENV'] === 'production') {
    const allowedOrigins = [
      'https://www.packmovego.com',
      'https://packmovego.com'
    ];
    
    // Allow Vercel preview deployments
    const isVercelDomain = origin && origin.includes('vercel.app');
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);
    
    if (!isAllowedOrigin && !isVercelDomain) {
      console.log(`❌ Unauthorized origin: ${origin || 'None'} for ${requestPath} from ${clientIp}`);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized origin',
        error: `Origin ${origin || 'None'} is not allowed`,
        allowedOrigins: allowedOrigins,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // All validations passed
  console.log(`✅ Frontend validation passed for ${requestPath} from ${clientIp} (Origin: ${origin})`);
  return next();
}

// Middleware to set frontend cookie if missing
export function setFrontendCookieMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientCookie = req.cookies?.app_client;
  
  if (!clientCookie || clientCookie !== 'frontend_app') {
    console.log(`🍪 Setting frontend cookie for ${req.path}`);
    res.cookie('app_client', 'frontend_app', {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }
  
  next();
}

// Rate limiting specifically for frontend validation
const frontendRateLimit = new Map<string, { count: number; resetTime: number }>();
const FRONTEND_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const FRONTEND_RATE_LIMIT_MAX = 200; // 200 requests per minute for frontend

export function frontendRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for v0 endpoints (public content)
  if (req.path.startsWith('/v0/')) {
    return next();
  }
  
  const clientIp = getClientIp(req);
  const now = Date.now();
  
  // Clean up expired entries
  for (const [ip, data] of frontendRateLimit.entries()) {
    if (now > data.resetTime) {
      frontendRateLimit.delete(ip);
    }
  }
  
  const ipData = frontendRateLimit.get(clientIp);
  
  if (!ipData) {
    frontendRateLimit.set(clientIp, {
      count: 1,
      resetTime: now + FRONTEND_RATE_LIMIT_WINDOW
    });
    return next();
  }
  
  if (now > ipData.resetTime) {
    ipData.count = 1;
    ipData.resetTime = now + FRONTEND_RATE_LIMIT_WINDOW;
    return next();
  }
  
  ipData.count++;
  
  if (ipData.count > FRONTEND_RATE_LIMIT_MAX) {
    console.log(`❌ Frontend rate limit exceeded for IP: ${clientIp}`);
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded',
      resetTime: new Date(ipData.resetTime).toISOString(),
      timestamp: new Date().toISOString()
    });
  }
  
  return next();
}

// Complete frontend security middleware stack
export function completeFrontendSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Apply middleware in sequence
  frontendRateLimitMiddleware(req, res, (err) => {
    if (err) return next(err);
    
    setFrontendCookieMiddleware(req, res, (err) => {
      if (err) return next(err);
      
      frontendValidationMiddleware(req, res, next);
    });
  });
} 