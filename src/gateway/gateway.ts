import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { log, consoleLogger } from '../util/console-logger';
import { sessionLogger } from '../util/session-logger';
import fs from 'fs';
import https from 'https';
import { securityMiddleware } from '../middlewares/security';

// Load environment configuration
import envLoader from '../../config/env';

const config = envLoader.getConfig();

// Arcjet protection
import aj from '../../config/arcjet';
const app = express();
// On Render, use PORT env var (10000), otherwise use GATEWAY_PORT for local dev
const PORT = config.PORT || config.GATEWAY_PORT;
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
    }
  } catch (_) {
    // Non-blocking on errors
  }
  next();
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
  // Skip Arcjet for health endpoints (including Render's /api/health checks)
  if(req.path==='/health' || req.path==='/v0/health' || req.path==='/api/health') {
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
  console.log('\n' + '='.repeat(80));
  console.log('>>> Gateway API Key Check - Path:', req.path);
  console.log('='.repeat(80) + '\n');
  
  // Skip auth for health endpoints (including Render's /api/health checks)
  if(req.path==='/health' || req.path==='/v0/health' || req.path==='/api/health') {
    console.log(`>>> Skipping auth for health check: ${req.path}`);
    return next();
  }
  
  // Check for API key in headers
  const apiKey=req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  console.log('>>> API Key present?', !!apiKey); // Debug
  
  if(!apiKey) {
    console.log('>>> NO API KEY - BLOCKING REQUEST');
    
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
    console.error('Timestamp:', errorMsg.timestamp);
    console.error('Action: Redirecting to https://packmovego.com');
    console.error('━'.repeat(80) + '\n');
    
    log.warn('gateway', `Unauthorized access attempt from ${req.ip}`, {
      path: req.path,
      method: req.method,
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent')
    });
    
    // Redirect to main website
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
      timestamp: new Date().toISOString()
    };
    
    console.error('🚫 Gateway - Invalid API Key:', JSON.stringify(errorMsg, null, 2));
    log.warn('gateway', `Invalid API key from ${req.ip}`, {
      path: req.path,
      origin: req.get('Origin')
    });
    
    // Redirect to main website
    return res.redirect(301, 'https://packmovego.com');
  }
  
  console.log('✅ Gateway - API key validated, passing to next middleware');
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

// Health check endpoints (both /health and /v0/health)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    privateApiUrl: PRIVATE_API_URL
  });
});

app.get('/v0/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'gateway',
    version: 'v0',
    timestamp: new Date().toISOString(),
    privateApiUrl: PRIVATE_API_URL
  });
});

// API root endpoint
app.get('/', (req, res) => {
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

// Proxy configuration
const proxyOptions = {
  target: PRIVATE_API_URL,
  changeOrigin: true,
  // Allow self-signed certs when proxying to local HTTPS API
  secure: false,
  // Preserve the full path including the mount point
  pathRewrite: (path: string, req: any) => {
    // Don't rewrite, keep the original path
    return path;
  },
  onProxyReq: (proxyReq: any, req: any, res: any) => {
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
    log.error('gateway', 'Proxy error', {
      error: err.message,
      path: req.path,
      target: PRIVATE_API_URL
    });
    
    res.status(502).json({
      error: 'Gateway Error',
      message: 'Unable to connect to private API service',
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
    proxyReq(proxyReq, req, res) {
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
      console.error('❌ Gateway - Proxy error:', err.message);
      if(res && 'headersSent' in res && !res.headersSent){
        (res as any).status(502).json({
          error: 'Gateway Error',
          message: 'Unable to connect to private API service',
          timestamp: new Date().toISOString()
        });
      }
    }
  }
});

// Apply the proxy to all matched routes
console.log('🔧 Gateway - Installing proxy middleware');
app.use((req, res, next) => {
  console.log(`🔍 Gateway - Before proxy: ${req.method} ${req.path}`);
  
  // WORKAROUND: Manually add gateway headers before proxying
  // The onProxyReq callback isn't firing, so we add them to the request object
  req.headers['x-gateway-request']='true';
  req.headers['x-gateway-service']='pack-go-movers-gateway';
  req.headers['x-original-host']=req.headers.host || 'unknown';
  
  console.log('✅ Gateway - Manually added headers to request:', {
    'x-gateway-request': req.headers['x-gateway-request'],
    'x-gateway-service': req.headers['x-gateway-service']
  });
  
  next();
});
app.use(proxy);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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