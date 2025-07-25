import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// API Key validation
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  // Skip API key validation for health checks
  if (req.path === '/api/health' || req.path === '/health' || req.path === '/api/health/simple') {
    return next();
  }

  // Check if API key authentication is enabled
  if (process.env.API_KEY_ENABLED !== 'true') {
    return next();
  }

  const apiKey = (Array.isArray(req.headers['x-api-key']) ? req.headers['x-api-key'][0] : req.headers['x-api-key']) || 
                 req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    console.log(`🚫 Missing API key for ${req.method} ${req.path} from ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'Please provide a valid API key in the x-api-key header or Authorization header',
      timestamp: new Date().toISOString()
    });
  }

  // Validate API key
  const validKeys = [
    process.env.API_KEY_FRONTEND,
    process.env.API_KEY_ADMIN
  ].filter(Boolean);

  if (!validKeys.includes(apiKey)) {
    console.log(`🚫 Invalid API key for ${req.method} ${req.path} from ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided API key is not valid',
      timestamp: new Date().toISOString()
    });
  }

  // Log successful API key validation
  const keyType = apiKey === process.env.API_KEY_FRONTEND ? 'frontend' : 
                  apiKey === process.env.API_KEY_ADMIN ? 'admin' : 'unknown';
  console.log(`✅ Valid ${keyType} API key for ${req.method} ${req.path} from ${req.ip}`);
  
  // Add key type to request for potential future use
  (req as any).apiKeyType = keyType;
  
  next();
}

const authenticatedSessions=new Map<string,{ip:string;expires:number}>();//Session storage for authenticated users (in production, use Redis)

// Configuration
const AUTH_CONFIG ={
  IS_PRODUCTION:process.env.NODE_ENV==='production',
  JWT_SECRET:process.env.JWT_SECRET||'Bad Auth',
  SESSION_DURATION:10*60*1000,//10 minutes in milliseconds
  ADMIN_PASSWORD:process.env.ADMIN_PASSWORD||'Bad Auth',
  FRONTEND_IP:process.env.ALLOWED_IPS?.split(',')[0]?.trim()||'Bad Auth',
  ALLOWED_IPS:(process.env.ALLOWED_IPS||'').split(',').map(ip => ip.trim()).filter(Boolean),
  REDIRECT_URL:'https://www.packmovego.com',
  FRONTEND_DOMAIN:'https://www.packmovego.com',
  API_DOMAIN:'https://api.packmovego.com'
};

// Get client IP from various headers
function getClientIp(req:Request):string{
  let clientIp=req.headers['x-forwarded-for']?.toString().split(',')[0].trim()|| 
                 req.headers['x-real-ip']?.toString()|| 
                 req.headers['cf-connecting-ip']?.toString()||
                 req.headers['x-client-ip']?.toString()||
                 req.socket.remoteAddress|| '';
  if(clientIp.startsWith('::ffff:')){clientIp=clientIp.substring(7);}// Remove IPv6 prefix if present
  return clientIp;
}

// Check if request is from the frontend domain
function isFrontendRequest(req: Request): boolean {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Check origin header
  if (origin && (origin === AUTH_CONFIG.FRONTEND_DOMAIN || origin === 'https://packmovego.com')) {
    return true;
  }
  
  // Check referer header
  if (referer && (referer.startsWith(AUTH_CONFIG.FRONTEND_DOMAIN) || referer.startsWith('https://packmovego.com'))) {
    return true;
  }
  
  // In development, also allow localhost
  if (!AUTH_CONFIG.IS_PRODUCTION) {
    if (origin && origin.includes('localhost')) {
      return true;
    }
    if (referer && referer.includes('localhost')) {
      return true;
    }
  }
  
  return false;
}

// Check if IP is the frontend IP
function isFrontendIp(ip: string): boolean {
  return ip === AUTH_CONFIG.FRONTEND_IP;
}

// Check if IP is in allowed list
function isAllowedIp(ip: string): boolean {
  return AUTH_CONFIG.ALLOWED_IPS.includes(ip);
}

// Generate JWT token
function generateToken(ip: string): string {
  return jwt.sign(
    { 
      ip, 
      type: 'admin-access',
      timestamp: Date.now() 
    },
    AUTH_CONFIG.JWT_SECRET,
    { expiresIn: '10m' }
  );
}

// Verify JWT token
function verifyToken(token: string): { ip: string; valid: boolean } {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as any;
    return { ip: decoded.ip, valid: true };
  } catch (error) {
    return { ip: '', valid: false };
  }
}

// Check if user is authenticated
function isAuthenticated(req: Request): boolean {
  const clientIp = getClientIp(req);
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.authToken;
  
  if (!token) {
    return false;
  }
  
  const { ip, valid } = verifyToken(token);
  if (!valid || ip !== clientIp) {
    return false;
  }
  
  // Check if session is still valid
  const session = authenticatedSessions.get(token);
  if (!session || session.expires < Date.now()) {
    authenticatedSessions.delete(token);
    return false;
  }
  
  return true;
}

// Main authentication middleware
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req);
  const requestPath = req.path;
  const method = req.method;
  
  console.log(`🔐 Auth check for IP: ${clientIp} accessing: ${requestPath} (${method})`);
  
  // Always allow OPTIONS requests for CORS preflight
  if (method === 'OPTIONS') {
    console.log(`✅ Allowing OPTIONS request for CORS preflight`);
    return next();
  }
  
  // Always allow health checks
  if (requestPath === '/api/health' || requestPath === '/api/health/simple' || requestPath === '/health') {
    return next();
  }
  
  // Always allow frontend requests (by domain or referer)
  if (isFrontendRequest(req)) {
    console.log(`✅ Frontend request allowed from ${req.headers.origin || clientIp}`);
    return next();
  }
  
  // Check if IP is in allowed list - if NOT allowed, redirect to frontend
  if (!isAllowedIp(clientIp)) {
    console.log(`🚫 IP ${clientIp} not in allowed list, redirecting to ${AUTH_CONFIG.REDIRECT_URL}`);
    return res.redirect(302, AUTH_CONFIG.REDIRECT_URL);
  }
  
  // For authenticated users accessing dashboard, allow access
  if (requestPath === '/dashboard' && isAuthenticated(req)) {
    console.log(`✅ Authenticated user accessing dashboard from IP: ${clientIp}`);
    return next();
  }
  
  // For authorized IPs, allow access to login page and auth endpoints
  if (requestPath === '/login' || requestPath === '/api/auth/login' || requestPath === '/api/auth/logout' || requestPath === '/api/auth/status') {
    console.log(`✅ Authorized IP ${clientIp} accessing auth endpoint: ${requestPath}`);
    return next();
  }
  
  // For all other requests from allowed IPs, require authentication
  console.log(`🔒 Authentication required for IP: ${clientIp}`);
  
  // Check if this is an API request
  if (requestPath.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      requiresPassword: true,
      redirectUrl: AUTH_CONFIG.REDIRECT_URL
    });
  }
  
  // For non-API requests from authorized IPs, redirect to login page
  console.log(`🔐 Redirecting authorized IP ${clientIp} to login page`);
  return res.redirect(302, '/login');
}

// Login endpoint handler
export function handleLogin(req: Request, res: Response) {
  const { password } = req.body;
  const clientIp = getClientIp(req);
  
  console.log(`🔐 Login attempt from IP: ${clientIp}`);
  
  if (!isAllowedIp(clientIp)) {
    console.log(`🚫 Login attempt from unauthorized IP: ${clientIp}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  if (password === AUTH_CONFIG.ADMIN_PASSWORD) {
    const token = generateToken(clientIp);
    const expires = Date.now() + AUTH_CONFIG.SESSION_DURATION;
    
    // Store session
    authenticatedSessions.set(token, { ip: clientIp, expires });
    
    // Clean up expired sessions
    for (const [sessionToken, session] of authenticatedSessions.entries()) {
      if (session.expires < Date.now()) {
        authenticatedSessions.delete(sessionToken);
      }
    }
    
    console.log(`✅ Login successful for IP: ${clientIp}`);
    
    // Set cookie and return token
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: AUTH_CONFIG.SESSION_DURATION,
      sameSite: 'strict'
    });
    
    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      expiresIn: AUTH_CONFIG.SESSION_DURATION
    });
  }
  
  console.log(`❌ Login failed for IP: ${clientIp} - Invalid password`);
  return res.status(401).json({
    success: false,
    message: 'Invalid password'
  });
}

// Logout endpoint handler
export function handleLogout(req: Request, res: Response) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.authToken;
  
  if (token) {
    authenticatedSessions.delete(token);
  }
  
  res.clearCookie('authToken');
  
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
}

// Check authentication status
export function checkAuthStatus(req: Request, res: Response) {
  const clientIp = getClientIp(req);
  const isAuth = isAuthenticated(req);
  const isFrontend = isFrontendRequest(req);
  
  return res.json({
    success: true,
    authenticated: isAuth,
    ip: clientIp,
    isFrontend: isFrontend,
    isAllowed: isAllowedIp(clientIp),
    requiresPassword: isAllowedIp(clientIp) && !isFrontend
  });
}

export { AUTH_CONFIG }; 