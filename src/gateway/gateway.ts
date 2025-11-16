import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { log } from '../util/console-logger';
import { sessionLogger } from '../util/session-logger';
import fs from 'fs';
import https from 'https';
// import { securityMiddleware } from '../middlewares/security'; // Unused - gateway has its own security

// Load environment configuration
import envLoader from '../../config/env';

const config = envLoader.getConfig();

// Arcjet protection
import aj from '../../config/arcjet';
const app = express();
// In production, use GATEWAY_PORT (10000), otherwise fallback to PORT
// Backend uses PORT (15050) in production
const PORT = config.GATEWAY_PORT || config.PORT;
const PRIVATE_API_URL = config.PRIVATE_API_URL;

// Security middleware
app.use(helmet());
app.use(compression());

// Session logging middleware (logs all requests with timestamps)
app.use(sessionLogger.middleware());

// Start periodic session stats logging (every 5 minutes)
sessionLogger.startPeriodicLogging(300000);

// Enforce HTTPS for api.packmovego.com at the edge: block http with 403 and suggest redirect
app.use((req, res, next) => {
  try {
    const originalHost = (req.headers['x-original-host'] as string) || '';
    const host = originalHost || (req.headers.host || '');
    const forwardedProtoHeader = (req.headers['x-forwarded-proto'] as string) || '';
    const forwardedProto = forwardedProtoHeader.split(',')[0]?.trim().toLowerCase();
    const isHttps = (req as any).secure || forwardedProto === 'https';
    const isApiDomain = host === 'api.packmovego.com' || host.endsWith('.api.packmovego.com');

    if (isApiDomain && !isHttps) {
      const redirectUrl = 'https://www.packmovego.com';
      res.setHeader('Location', redirectUrl);
      return res.status(403).json({
        success: false,
        error: 'HTTPS Required',
        message: 'Use HTTPS when calling api.packmovego.com',
        redirect: redirectUrl,
        timestamp: new Date().toISOString()
      });
      return;
    }
  } catch (_) {
    // Non-blocking on errors
  }
  return next();
});

// CORS configuration
app.use(cors({
  origin: envLoader.getCorsOrigins(),
  credentials: true,
  methods: config.CORS_METHODS.split(','),
  allowedHeaders: config.CORS_ALLOWED_HEADERS.split(',')
}));

// Arcjet protection middleware (bot detection, rate limiting, shield)
app.use(async (req, res, next) => {
  // Skip Arcjet for Gateway's own health endpoint only (not proxied /health)
  if(req.path==='/v0/health') {
    return next();
  }
  
  // Skip Arcjet entirely in development mode
  if(config.NODE_ENV==='development') {
    console.log('🔓 Gateway - Arcjet DISABLED in development mode');
    return next();
  }
  
  try {
    const decision=await aj.protect(req, {requested:1});
    
    // Debug: Log Arcjet decision
    console.log('🔍 Gateway - Arcjet Decision:', {
      isDenied: decision.isDenied(),
      isAllowed: decision.isAllowed(),
      reason: decision.reason,
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    if(decision.isDenied()) {
      if(decision.reason.isRateLimit()) {
        const errorMsg={
          success: false,
          error: 'Rate Limit Exceeded',
          message: 'Too many requests',
          ip: req.ip,
          path: req.path,
          timestamp: new Date().toISOString()
        };
        
        console.error('🚫 Gateway - Rate Limit:', JSON.stringify(errorMsg, null, 2));
        log.warn('gateway', `Rate limit exceeded from ${req.ip}`, {
          path: req.path
        });
        
        // Redirect to main website
        return res.redirect(301, 'https://packmovego.com');
      }
      
      if(decision.reason.isBot()) {
        const errorMsg={
          success: false,
          error: 'Bot Detected',
          message: 'Bot traffic not allowed',
          ip: req.ip,
          path: req.path,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        };
        
        console.error('🚫 Gateway - Bot Detected:', JSON.stringify(errorMsg, null, 2));
        log.warn('gateway', `Bot detected from ${req.ip}`, {
          path: req.path,
          userAgent: req.get('User-Agent')
        });
        
        // Redirect to main website
        return res.redirect(301, 'https://packmovego.com');
      }
      
      const errorMsg={
        success: false,
        error: 'Access Denied',
        message: 'Arcjet protection blocked request',
        ip: req.ip,
        path: req.path,
        reason: decision.reason,
        timestamp: new Date().toISOString()
      };
      
      console.error('🚫 Gateway - Access Denied:', JSON.stringify(errorMsg, null, 2));
      log.warn('gateway', `Access denied from ${req.ip}`, {
        path: req.path,
        reason: decision.reason
      });
      
      // Redirect to main website
      return res.redirect(301, 'https://packmovego.com');
    }
    
    next();
  } catch(error) {
    log.error('gateway', 'Arcjet protection error', {error});
    // Don't block on Arcjet errors in development
    if(config.NODE_ENV==='development') {
      next();
    } else {
      // Redirect on error in production for security
      return res.redirect(301, 'https://packmovego.com');
    }
  }
});

// Frontend API key authentication middleware
const FRONTEND_API_KEY=config.API_KEY_FRONTEND || 'pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6';

app.use((req, res, next) => {
  // Enhanced debug logging for API key validation
  if(config.NODE_ENV==='development') {
  console.log('\n' + '='.repeat(80));
  console.log('>>> Gateway API Key Check - Path:', req.path);
    console.log('>>> Method:', req.method);
    console.log('>>> Origin:', req.get('Origin') || 'None');
    console.log('>>> Headers:', JSON.stringify({
      'x-api-key': req.headers['x-api-key'] ? 'present' : 'missing',
      'authorization': req.headers['authorization'] ? 'present' : 'missing',
      'content-type': req.headers['content-type'] || 'none'
    }, null, 2));
  console.log('='.repeat(80) + '\n');
  }
  
  // Skip auth ONLY for Gateway's own health endpoint (/v0/health)
  // The /health endpoint will be proxied to Private API and requires API key
  if(req.path==='/v0/health') {
    if(config.NODE_ENV==='development') {
    console.log(`>>> Skipping auth for Gateway health check: ${req.path}`);
    }
    return next();
  }
  
  // Check for API key in headers
  const apiKey=req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if(config.NODE_ENV==='development') {
    console.log('>>> API Key present?', !!apiKey);
    if(apiKey) {
      console.log('>>> API Key length:', apiKey.length);
      console.log('>>> API Key matches?', apiKey===FRONTEND_API_KEY);
    }
  }
  
  if(!apiKey) {
    const errorMsg={
      success: false,
      error: 'Unauthorized',
      message: 'API key required',
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      timestamp: new Date().toISOString()
    };
    
    console.error('\n🚫 UNAUTHORIZED ACCESS ATTEMPT 🚫');
    console.error('━'.repeat(80));
    console.error('Location: https://localhost:3000' + req.path);
    console.error('Method:', req.method);
    console.error('IP Address:', req.ip);
    console.error('User Agent:', req.get('User-Agent') || 'Unknown');
    console.error('Origin:', req.get('Origin') || 'None');
    console.error('All Headers:', JSON.stringify(req.headers, null, 2));
    console.error('Timestamp:', errorMsg.timestamp);
    console.error('Action: Returning 401 Unauthorized');
    console.error('━'.repeat(80) + '\n');
    
    log.warn('gateway', `Unauthorized access attempt from ${req.ip}`, {
      path: req.path,
      method: req.method,
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent')
    });
    
    // Return 401 instead of redirecting in development
    if(config.NODE_ENV==='development') {
      return res.status(401).json(errorMsg);
    }
    
    // Redirect to main website in production
    return res.redirect(301, 'https://packmovego.com');
  }
  
  if(apiKey!==FRONTEND_API_KEY) {
    const errorMsg={
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key',
      ip: req.ip,
      path: req.path,
      origin: req.get('Origin'),
      timestamp: new Date().toISOString(),
      receivedKeyLength: apiKey.length,
      expectedKeyLength: FRONTEND_API_KEY.length
    };
    
    console.error('🚫 Gateway - Invalid API Key:', JSON.stringify(errorMsg, null, 2));
    log.warn('gateway', `Invalid API key from ${req.ip}`, {
      path: req.path,
      origin: req.get('Origin')
    });
    
    // Return 401 instead of redirecting in development
    if(config.NODE_ENV==='development') {
      return res.status(401).json(errorMsg);
    }
    
    // Redirect to main website in production
    return res.redirect(301, 'https://packmovego.com');
  }
  
  if(config.NODE_ENV==='development') {
  console.log('✅ Gateway - API key validated, passing to next middleware');
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log('📝 Gateway - Request logging middleware');
  const startTime=Date.now();
  
  log.info('gateway', `${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin')
  });
  
  res.on('finish', () => {
    const responseTime=Date.now()-startTime;
    log.info('gateway', `Response ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      responseTime: `${responseTime}ms`
    });
  });
  
  next();
});

// Health check endpoint - Gateway's own status
app.get('/v0/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'gateway',
    version: 'v0',
    timestamp: new Date().toISOString(),
    privateApiUrl: PRIVATE_API_URL
  });
});

// Note: /health endpoint removed - it now proxies to Private API's /v0/health

// API root endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'PackMoveGO Gateway Service',
    status: 'running',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/*',
      v0: '/v0/*',
      data: '/data/*'
    }
  });
});

// Apply security middleware AFTER public endpoints and BEFORE proxy routes
// NOTE: Disabled securityMiddleware in gateway since it has its own API key validation
// The server will apply securityMiddleware when it receives proxied requests
// app.use(securityMiddleware);

// Proxy configuration (unused - options are inline in createProxyMiddleware below)
// @ts-ignore - proxyOptions kept for documentation/reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const proxyOptions = {
  target: PRIVATE_API_URL,
  changeOrigin: true,
  // Allow self-signed certs when proxying to local HTTPS API
  secure: false,
  // Preserve the full path including the mount point
  pathRewrite: (path: string, _req: any) => {
    // Don't rewrite, keep the original path
    return path;
  },
  onProxyReq: (proxyReq: any, req: any, _res: any) => {
    // Forward the API key from the original request
    const apiKey=req.headers['x-api-key'] || req.headers['authorization'];
    if(apiKey){
      proxyReq.setHeader('x-api-key', apiKey);
    }
    
    // Add gateway headers
    proxyReq.setHeader('X-Gateway-Service', 'pack-go-movers-gateway');
    proxyReq.setHeader('X-Gateway-Request', 'true'); // Special header to identify gateway requests
    proxyReq.setHeader('X-Original-Host', req.get('Host'));
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    
    console.log('🔄 Gateway - Proxying request with headers:', {
      path: proxyReq.path,
      'X-Gateway-Request': 'true',
      'X-Gateway-Service': 'pack-go-movers-gateway'
    });
    
    log.debug('gateway', `Proxying to ${PRIVATE_API_URL}${proxyReq.path}`);
  },
  onProxyRes: (proxyRes: any, req: any, res: any) => {
    // Add gateway response headers
    res.setHeader('X-Gateway-Service', 'pack-go-movers-gateway');
    res.setHeader('X-Proxied-By', 'gateway');
    
    // Intercept 403 responses from server (direct access attempts)
    if(proxyRes.statusCode===403) {
      const errorMsg={
        success: false,
        error: 'Forbidden',
        message: 'Direct server access blocked',
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      };
      
      console.error('🚫 Gateway - Server Access Blocked:', JSON.stringify(errorMsg, null, 2));
      log.warn('gateway', `Server returned 403 for ${req.ip}`, {
        path: req.path
      });
      
      // Redirect to main website
      return res.redirect(301, 'https://packmovego.com');
    }
    
    log.debug('gateway', `Proxied response ${proxyRes.statusCode}`, {
      path: req.path,
      statusCode: proxyRes.statusCode
    });
  },
  onError: (err: any, req: any, res: any) => {
    const errnoError = err as NodeJS.ErrnoException;
    const errorCode = errnoError.code || 'UNKNOWN';
    
    log.error('gateway', 'Proxy error', {
      error: err.message,
      code: errorCode,
      path: req.path,
      target: PRIVATE_API_URL
    });
    
    // Provide more specific error messages based on error code
    let errorMessage = 'Unable to connect to private API service';
    let statusCode = 502;
    
    if (errorCode === 'ECONNREFUSED') {
      errorMessage = `Backend server is not running or not accessible at ${PRIVATE_API_URL}. Please ensure the backend service is started.`;
      statusCode = 503;
    } else if (errorCode === 'ETIMEDOUT') {
      errorMessage = `Connection to backend server at ${PRIVATE_API_URL} timed out. The server may be overloaded or unreachable.`;
      statusCode = 503;
    } else if (errorCode === 'ENOTFOUND') {
      errorMessage = `Backend server hostname not found: ${PRIVATE_API_URL}. Please check your configuration.`;
      statusCode = 502;
    }
    
    res.status(statusCode).json({
      error: 'Gateway Error',
      message: errorMessage,
      code: errorCode,
      target: PRIVATE_API_URL,
      timestamp: new Date().toISOString()
    });
  }
};

// Proxy all API requests to private service
const proxy=createProxyMiddleware({
  target: PRIVATE_API_URL,
  changeOrigin: true,
  secure: false,
  on: {
    proxyReq(proxyReq, req, _res) {
      console.log('🔄 Gateway - onProxyReq called for:', req.url);
      
      // Forward the API key
    const apiKey=(req.headers['x-api-key'] || req.headers['authorization']) as string;
    if(apiKey){
      proxyReq.setHeader('x-api-key', apiKey);
      console.log('✅ Gateway - Forwarded API key');
    }
    
    // Add gateway headers
    proxyReq.setHeader('X-Gateway-Service', 'pack-go-movers-gateway');
    proxyReq.setHeader('X-Gateway-Request', 'true');
    proxyReq.setHeader('X-Original-Host', req.headers.host || 'unknown');
    proxyReq.setHeader('X-Forwarded-For', req.socket.remoteAddress || 'unknown');
    
    console.log('✅ Gateway - Added headers: X-Gateway-Request=true, X-Gateway-Service=pack-go-movers-gateway');
    
    // Log all headers being sent
    console.log('📤 Gateway - All proxy request headers:', proxyReq.getHeaders());
    },
    proxyRes(proxyRes, req, res) {
      console.log(`✅ Gateway - Proxy response: ${proxyRes.statusCode} for ${req.url}`);
      res.setHeader('X-Gateway-Service', 'pack-go-movers-gateway');
      res.setHeader('X-Proxied-By', 'gateway');
    },
    error(err, req, res) {
      //Type cast err to NodeJS.ErrnoException to access code property
      const errnoError = err as NodeJS.ErrnoException;
      //Type cast req to express.Request to access path property
      const expressReq = req as express.Request;
      
      console.error('❌ Gateway - Proxy error:', err.message);
      console.error('❌ Gateway - Error details:', {
        code: errnoError.code,
        message: err.message,
        path: expressReq.path || req.url,
        target: PRIVATE_API_URL,
        stack: err.stack
      });
      
      if(res && 'headersSent' in res && !res.headersSent){
        const errorCode = errnoError.code || 'UNKNOWN';
        let errorMessage = 'Unable to connect to private API service';
        let statusCode = 502;
        
        // Provide more specific error messages based on error code
        if (errorCode === 'ECONNREFUSED') {
          errorMessage = `Backend server is not running or not accessible at ${PRIVATE_API_URL}. Please ensure the backend service is started on port ${PRIVATE_API_URL.split(':').pop() || '3001'}.`;
          statusCode = 503;
        } else if (errorCode === 'ETIMEDOUT') {
          errorMessage = `Connection to backend server at ${PRIVATE_API_URL} timed out. The server may be overloaded or unreachable.`;
          statusCode = 503;
        } else if (errorCode === 'ENOTFOUND') {
          errorMessage = `Backend server hostname not found: ${PRIVATE_API_URL}. Please check your configuration.`;
          statusCode = 502;
        } else if (errorCode === 'ECONNREFUSED' || errorCode === 'ETIMEDOUT') {
          statusCode = 503;
        }
        
        (res as any).status(statusCode).json({
          error: 'Gateway Error',
          message: errorMessage,
          code: errorCode,
          path: expressReq.path || req.url,
          target: PRIVATE_API_URL,
          timestamp: new Date().toISOString(),
          ...(config.NODE_ENV === 'development' && {
            hint: 'In development, ensure the backend server is running and accessible at the configured PRIVATE_API_URL'
          })
        });
      }
    }
  }
});

// Apply the proxy to all matched routes
console.log('🔧 Gateway - Installing proxy middleware');
app.use((req, _res, next) => {
  if(config.NODE_ENV==='development') {
  console.log(`🔍 Gateway - Before proxy: ${req.method} ${req.path}`);
    console.log(`🔍 Gateway - Request origin: ${req.get('Origin') || 'None'}`);
    console.log(`🔍 Gateway - Request headers:`, {
      'x-api-key': req.headers['x-api-key'] ? 'present' : 'missing',
      'content-type': req.headers['content-type'] || 'none',
      'origin': req.get('Origin') || 'none'
    });
  }
  
  // WORKAROUND: Manually add gateway headers before proxying
  // The onProxyReq callback isn't firing, so we add them to the request object
  req.headers['x-gateway-request']='true';
  req.headers['x-gateway-service']='pack-go-movers-gateway';
  req.headers['x-original-host']=req.headers.host || 'unknown';
  
  if(config.NODE_ENV==='development') {
  console.log('✅ Gateway - Manually added headers to request:', {
    'x-gateway-request': req.headers['x-gateway-request'],
    'x-gateway-service': req.headers['x-gateway-service']
  });
    console.log(`🔍 Gateway - Proxying to: ${PRIVATE_API_URL}${req.path}`);
  }
  
  next();
});
app.use(proxy);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error('gateway', 'Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(500).json({
    error: 'Internal Gateway Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  log.warn('gateway', `Route not found: ${req.method} ${req.path}`);
  
  res.status(404).json({
    error: 'Not Found',
    message: 'API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

const USE_SSL=config.USE_SSL;
const SSL_KEY=config.GATEWAY_SSL_KEY_PATH || config.SSL_KEY_PATH;
const SSL_CERT=config.GATEWAY_SSL_CERT_PATH || config.SSL_CERT_PATH;

// SSH Server setup
const SSH_ENABLED = config.SSH_ENABLED;
// @ts-ignore - sshServer is set but may not be used depending on configuration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let sshServer: any = null;

if (SSH_ENABLED) {
  try {
    const { sshServer: ssh } = require('../../config/certs/sshServer');
    sshServer = ssh;
    log.info('gateway', '🔐 SSH server enabled');
  } catch (error) {
    log.warning('gateway', 'SSH server not available');
  }
}

if(USE_SSL && fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)){
  const httpsOptions={
    key: fs.readFileSync(SSL_KEY),
    cert: fs.readFileSync(SSL_CERT),
  };
  https.createServer(httpsOptions, app).listen(parseInt(PORT.toString()), '0.0.0.0', ()=>{
    log.info('gateway', `🚀 Gateway service started on port ${PORT} (HTTPS)`);
    log.info('gateway', `🔐 SSL enabled with certificates`);
    log.info('gateway', `📡 Proxying to private API: ${PRIVATE_API_URL}`);
    log.info('gateway', `🔧 Environment: ${config.NODE_ENV}`);
    log.info('gateway', `🌍 CORS Origins: ${config.CORS_ORIGIN}`);
  });
}else{
  if(!USE_SSL){
    log.info('gateway', 'SSL disabled in configuration');
  }else{
    log.warning('gateway', `SSL certificates not found at: ${SSL_KEY}`);
  }
  app.listen(parseInt(PORT.toString()), '0.0.0.0', ()=>{
    log.info('gateway', `🚀 Gateway service started on port ${PORT} (HTTP - no SSL)`);
    log.info('gateway', `📡 Proxying to private API: ${PRIVATE_API_URL}`);
    log.info('gateway', `🔧 Environment: ${config.NODE_ENV}`);
    log.info('gateway', `🌍 CORS Origins: ${config.CORS_ORIGIN}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('gateway', '🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('gateway', '🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

export default app; 