import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB, getConnectionStatus } from './config/database';
import signupRoutes from './route/signup';
import sectionRoutes from './route/sectionRoutes';
import securityRoutes from './route/securityRoutes';
import prelaunchRoutes from './route/prelaunchRoutes';
import authRoutes from './route/authRoutes';
import sshRoutes from './route/sshRoutes';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { securityMiddleware, authMiddleware } from './middleware/security';
import dataRoutes from './route/dataRoutes';
import servicesRoutes from './route/servicesRoutes';
import { ipWhitelist } from './middleware/ipWhitelist';
import serverMonitor from './util/monitor';
import { performanceMiddleware } from './util/performance-monitor';
import analyticsRoutes from './route/analyticsRoutes';
import { advancedRateLimiter, burstProtection } from './util/api-limiter';
import { backupSystem } from './util/backup-system';
// Import SSH server but don't start it immediately
import { sshServer, SSH_CONFIG } from './ssh/sshServer';

// Conditional imports to avoid build errors
let validateEnvironment: any;
let setupSwagger: any;
let logger: any;
let logInfo: any;
let logError: any;
let logWarn: any;

try {
  const envValidation = require('./config/envValidation');
  validateEnvironment = envValidation.validateEnvironment;
} catch (error) {
  console.log('⚠️ Environment validation not available');
  validateEnvironment = () => ({ NODE_ENV: process.env.NODE_ENV || 'development', PORT: parseInt(process.env.PORT || '3000', 10) });
}

try {
  const swagger = require('./config/swagger');
  setupSwagger = swagger.setupSwagger;
} catch (error) {
  console.log('⚠️ Swagger not available');
  setupSwagger = () => {};
}

try {
  const loggerModule = require('./util/logger');
  logger = loggerModule.default;
  logInfo = loggerModule.logInfo;
  logError = loggerModule.logError;
  logWarn = loggerModule.logWarn;
} catch (error) {
  console.log('⚠️ Logger not available');
  logInfo = console.log;
  logError = console.error;
  logWarn = console.warn;
}

// Load environment variables from config directory
dotenv.config({ path: path.join(__dirname, '../config/.env') });

// Validate environment configuration
let envConfig;
try {
  envConfig = validateEnvironment();
  logInfo('✅ Environment validation passed');
} catch (error) {
  logError('❌ Environment validation failed', error);
  process.exit(1);
}

const app = express();
const port = envConfig.PORT;

// === IMMEDIATE HEALTH CHECK (for Render) ===
// This must be defined before any middleware that might block requests
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/simple', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// === IMMEDIATE /v0/ ROUTES (for frontend) ===
// These must be defined before any middleware that might redirect
const v0DataFiles = [
  'blog', 'about', 'nav', 'contact', 'referral', 'reviews', 'locations', 'supplies', 'services', 'testimonials'
];

// Handle OPTIONS requests for /v0/ routes (preflight)
app.options(['/v0/:name', '/v0/:name/'], (req, res) => {
  const origin = req.headers.origin || req.headers['origin'];
  const referer = req.headers.referer || req.headers['referer'];
  
  console.log(`🔧 /v0/ OPTIONS CORS CHECK: ${req.method} ${req.path} - Origin: "${origin}" - Referer: "${referer}"`);
  
  // Set CORS headers for packmovego.com and Vercel requests
  if (origin && (origin === 'https://www.packmovego.com' || origin === 'https://packmovego.com' || 
                 origin.includes('packmovego.com') || origin.includes('vercel.app'))) {
    console.log(`🔧 /v0/ OPTIONS CORS: Setting headers for origin: ${origin}`);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
    console.log(`✅ /v0/ OPTIONS CORS headers set!`);
  } else if (referer && (referer.includes('packmovego.com') || referer.includes('vercel.app'))) {
    console.log(`🔧 /v0/ OPTIONS CORS: Setting headers for referer: ${referer}`);
    res.setHeader('Access-Control-Allow-Origin', 'https://www.packmovego.com');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
    console.log(`✅ /v0/ OPTIONS CORS headers set via referer!`);
  } else {
    console.log(`❌ /v0/ OPTIONS CORS: No headers set. Origin: "${origin}", Referer: "${referer}"`);
  }
  
  res.status(200).end();
});

app.get(['/v0/:name', '/v0/:name/'], (req, res, next) => {
  const { name } = req.params;
  
  // Set CORS headers for /v0/ routes FIRST (before any response)
  const origin = req.headers.origin || req.headers['origin'];
  const referer = req.headers.referer || req.headers['referer'];
  
  console.log(`🔧 /v0/ CORS CHECK: ${req.method} ${req.path} - Origin: "${origin}" - Referer: "${referer}"`);
  
  // ALWAYS set CORS headers for packmovego.com and Vercel requests
  if (origin && (origin === 'https://www.packmovego.com' || origin === 'https://packmovego.com' || 
                 origin.includes('packmovego.com') || origin.includes('vercel.app'))) {
    console.log(`🔧 /v0/ CORS: Setting headers for origin: ${origin}`);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
    console.log(`✅ /v0/ CORS headers set!`);
  } else if (referer && (referer.includes('packmovego.com') || referer.includes('vercel.app'))) {
    console.log(`🔧 /v0/ CORS: Setting headers for referer: ${referer}`);
    res.setHeader('Access-Control-Allow-Origin', 'https://www.packmovego.com');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
    console.log(`✅ /v0/ CORS headers set via referer!`);
  } else {
    console.log(`❌ /v0/ CORS: No headers set. Origin: "${origin}", Referer: "${referer}"`);
  }
  
  if (v0DataFiles.includes(name)) {
    try {
      const data = require(`./data/${name.charAt(0).toUpperCase() + name.slice(1)}.json`);
      return res.json(data);
    } catch (e) {
      try {
        // Try lowercase fallback
        const data = require(`./data/${name}.json`);
        return res.json(data);
      } catch (err) {
        return res.status(404).json({ error: 'Not found' });
      }
    }
  }
  next();
});

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  logError('❌ Uncaught Exception:', error);
  // Don't exit immediately, let the server try to handle it
});

process.on('unhandledRejection', (reason, promise) => {
  logError('❌ Unhandled Rejection at:', promise);
  logError('Reason:', reason);
  // Don't exit immediately, let the server try to handle it
});

// Graceful shutdown handling
let server: any;

const gracefulShutdown = (signal: string) => {
  logInfo(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close((err: any) => {
      if (err) {
        logError('❌ Error during server shutdown:', err);
        process.exit(1);
      }
      
      logInfo('✅ Server closed successfully');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      logError('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Connect to MongoDB (optional in development)
connectDB().catch((err: Error) => {
  logError('❌ Failed to connect to MongoDB:', err);
  logWarn('⚠️ Continuing without database connection');
});

// CORS configuration for REST API
const corsOrigins = Array.isArray(envConfig.CORS_ORIGIN) ? envConfig.CORS_ORIGIN : 
                   typeof envConfig.CORS_ORIGIN === 'string' ? envConfig.CORS_ORIGIN.split(',').map((s: string) => s.trim()) : 
                   ['https://www.packmovego.com', 'https://packmovego.com'];

const allowedCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:5001',
  'https://www.packmovego.com',
  'https://packmovego.com',
  'https://packmovego-6x8w2t0kw-pack-move-go-frontend.vercel.app',
  'https://*.vercel.app',
  ...corsOrigins
].filter((origin, index, arr) => arr.indexOf(origin) === index);

const corsOptions = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    console.log(`🔍 CORS Origin Check: "${origin}"`);
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      console.log(`✅ CORS: Allowing request with no origin`);
      return callback(null, true);
    }
    
    if (allowedCorsOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowing origin from whitelist: ${origin}`);
      return callback(null, true);
    }
    
    // Allow any origin for packmovego.com subdomains
    if (origin.includes('packmovego.com')) {
      console.log(`✅ CORS: Allowing packmovego.com subdomain: ${origin}`);
      return callback(null, true);
    }
    
    // Allow Vercel domains
    if (origin.includes('vercel.app')) {
      console.log(`✅ CORS: Allowing Vercel domain: ${origin}`);
      return callback(null, true);
    }
    
    console.log(`❌ CORS: Rejecting origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  methods: envConfig.CORS_METHODS || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: envConfig.CORS_ALLOWED_HEADERS || ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Setup Swagger documentation (only in development)
if (envConfig.NODE_ENV === 'development') {
  setupSwagger(app);
  logInfo('📚 Swagger documentation available at /api-docs');
}

// Apply security middleware first
app.use(securityMiddleware);

// Apply performance monitoring
app.use(performanceMiddleware);

// Apply advanced rate limiting
app.use(advancedRateLimiter);
app.use(burstProtection);

// IMPORTANT: Apply CORS first to ensure proper headers are added before authentication
// Deployment trigger: 2025-07-26 00:02:00
// FORCE DEPLOYMENT: 2025-07-26 00:20:30 - CORS FIX

// Debug middleware to log headers
app.use((req, res, next) => {
  console.log(`🔍 CORS Debug: ${req.method} ${req.path}`);
  console.log(`   Origin (origin): ${req.headers.origin || 'None'}`);
  console.log(`   Origin (['origin']): ${req.headers['origin'] || 'None'}`);
  console.log(`   Referer: ${req.headers.referer || 'None'}`);
  console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'None'}`);
  console.log(`   All headers: ${JSON.stringify(Object.keys(req.headers))}`);
  next();
});

app.use(cors(corsOptions));

// Global CORS middleware - sets headers for ALL packmovego.com requests
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers['origin'];
  const referer = req.headers.referer || req.headers['referer'];
  
  console.log(`🌐 GLOBAL CORS CHECK: ${req.method} ${req.path}`);
  console.log(`   Origin: "${origin}" (type: ${typeof origin})`);
  console.log(`   Referer: "${referer}"`);
  
  // Set CORS headers for all packmovego.com and Vercel requests
  if (origin && (origin === 'https://www.packmovego.com' || origin === 'https://packmovego.com' || 
                 origin.includes('packmovego.com') || origin.includes('vercel.app'))) {
    console.log(`🔧 GLOBAL CORS: Setting headers for origin: ${origin}`);
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Vary', 'Origin');
    console.log(`✅ GLOBAL CORS headers set!`);
  } else if (referer && (referer.includes('packmovego.com') || referer.includes('vercel.app'))) {
    console.log(`🔧 GLOBAL CORS: Setting headers for referer: ${referer}`);
    res.header('Access-Control-Allow-Origin', 'https://www.packmovego.com');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Vary', 'Origin');
    console.log(`✅ GLOBAL CORS headers set via referer!`);
  } else {
    console.log(`❌ GLOBAL CORS: No headers set. Origin: "${origin}", Referer: "${referer}"`);
  }
  
  next();
});

// Basic middleware (after CORS)
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MOBILE-FRIENDLY API - Simplified Authentication
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const userAgent = req.headers['user-agent'] || '';
  
  // Debug logging for all requests
  console.log(`🔍 MOBILE API: ${req.method} ${req.path}`);
  console.log(`   Origin: "${origin || 'None'}"`);
  console.log(`   User-Agent: "${userAgent.substring(0, 50) || 'None'}"`);
  console.log(`   IP: "${req.ip || req.socket.remoteAddress || 'Unknown'}"`);
  
  // ALWAYS ALLOW MOBILE REQUESTS
  if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android') || 
      userAgent.includes('Safari') || userAgent.includes('Chrome') || userAgent.includes('Firefox')) {
    console.log(`✅ MOBILE REQUEST ALLOWED: ${req.method} ${req.path}`);
    
    // Set CORS headers for mobile
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
    
    return next();
  }
  
  // Allow all other requests too (for now)
  console.log(`✅ ALL REQUEST ALLOWED: ${req.method} ${req.path}`);
  return next();
  
  // ALL ROUTES ARE PUBLIC FOR MOBILE
  console.log(`✅ MOBILE API: All routes public for mobile`);
  
  // Set CORS headers for ALL requests
  const origin = req.headers.origin || req.headers['origin'] || '';
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Vary', 'Origin');
  
  return next();
});

// API-only routes - no login/dashboard pages needed
app.get('/login', (req, res) => {
  res.status(403).json({
    error: 'Access denied',
    message: 'This API is only accessible from packmovego.com',
    timestamp: new Date().toISOString()
  });
});

app.get('/dashboard', (req, res) => {
  res.status(403).json({
    error: 'Access denied', 
    message: 'This API is only accessible from packmovego.com',
    timestamp: new Date().toISOString()
  });
});

// Apply IP whitelist only to sensitive routes, not globally
// app.use(ipWhitelist); // Commented out to allow public access

// FINAL CORS ENFORCEMENT - runs after all other middleware
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers['origin'];
  const referer = req.headers.referer || req.headers['referer'];
  
  // Set CORS headers before response is sent
  res.on('finish', () => {
    // This runs after the response is sent, so we need to set headers earlier
  });
  
  // Set CORS headers immediately for packmovego.com requests
  if (origin && (origin === 'https://www.packmovego.com' || origin === 'https://packmovego.com' || origin.includes('packmovego.com'))) {
    console.log(`🚨 FINAL CORS ENFORCEMENT: Setting headers for ${origin} on ${req.method} ${req.path}`);
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Vary', 'Origin');
  } else if (referer && referer.includes('packmovego.com')) {
    console.log(`🚨 FINAL CORS ENFORCEMENT: Setting headers via referer for ${referer} on ${req.method} ${req.path}`);
    res.header('Access-Control-Allow-Origin', 'https://www.packmovego.com');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Vary', 'Origin');
  }
  
  next();
});

// Request timeout middleware
app.use((req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.warn(`⚠️ Request timeout for ${req.method} ${req.path}`);
      res.status(408).json({
        success: false,
        message: 'Request timeout',
        timestamp: new Date().toISOString()
      });
    }
  }, 30000); // 30 second timeout

  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
});

// Request logging middleware with monitoring
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const origin = req.get('Origin') || 'Unknown';
  const host = req.get('Host') || 'Unknown';
  const referer = req.get('Referer') || 'Unknown';
  
  console.log(`[${timestamp}] ${method} ${path} - Origin: ${origin} - User-Agent: ${userAgent} - Host: ${host} - Referer: ${referer}`);
  
  // Record response time and errors
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    serverMonitor.recordRequest(responseTime, isError);
    
    // Log response details for debugging
    if (res.statusCode >= 400) {
      console.log(`❌ ${method} ${path} - Status: ${res.statusCode} - Time: ${responseTime}ms`);
    }
  });
  
  next();
});

// Health check endpoint - optimized for Render (detailed version)
app.get('/api/health/detailed', (req, res) => {
  console.log(`✅ API Health check request: ${req.path} from ${req.ip}`);
  
  // Set a timeout for health checks to prevent hanging
  const healthCheckTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.warn('⚠️ Health check timeout, sending basic response');
      res.status(200).json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    }
  }, 5000); // 5 second timeout
  
  try {
    // Simple, fast response for Render health checks
    const response = {
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      serverPort: port,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      // Only include detailed metrics if not a Render health check
      ...(req.get('User-Agent') !== 'Render/1.0' && {
        memory: process.memoryUsage(),
        database: {
          connected: getConnectionStatus(),
          status: getConnectionStatus() ? 'connected' : 'disconnected'
        },
        requests: serverMonitor.getMetrics().requests
      })
    };
    
    clearTimeout(healthCheckTimeout);
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Health check error:', error);
    clearTimeout(healthCheckTimeout);
    // Even if there's an error, return a basic health response
    res.status(200).json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes with proper status codes
app.use('/api/auth', authRoutes);
app.use('/api/ssh', sshRoutes);

// All routes now protected by global auth middleware in production
app.use('/api/signup', signupRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/prelaunch', prelaunchRoutes);

// Public data routes that frontend can access without authentication
app.use('/api', dataRoutes);

// Enhanced services API routes
app.use('/api', servicesRoutes);

// Analytics and monitoring routes
app.use('/api', analyticsRoutes);

// === DEVELOPMENT MODE FIXES ===
if (envConfig.NODE_ENV !== 'production') {
  // 2. Serve / and /login with simple HTML or JSON (no redirect)
  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Development API Root',
      status: 'ok',
      environment: envConfig.NODE_ENV
    });
  });
  app.get('/login', (req, res) => {
    res.status(200).send('<h1>Development Login Page</h1><p>This is a placeholder login page for development mode.</p>');
  });
}

// === PRODUCTION MODE FIXES ===
if (envConfig.NODE_ENV === 'production') {
  // 2. Serve root with API info for frontend
  app.get('/', (req, res) => {
    const dbStatus = getConnectionStatus();
    return res.status(200).json({
      message: 'Welcome to PackMoveGO REST API',
      version: '1.0.0',
      status: 'running',
      environment: 'production',
      database: {
        connected: dbStatus,
        status: dbStatus ? 'connected' : 'disconnected'
      },
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/health',
        data: '/api/data/:name',
        content: {
          blog: '/v0/blog',
          about: '/v0/about',
          nav: '/v0/nav',
          contact: '/v0/contact',
          referral: '/v0/referral',
          reviews: '/v0/reviews',
          locations: '/v0/locations',
          supplies: '/v0/supplies',
          services: '/v0/services',
          testimonials: '/v0/testimonials'
        },
        enhancedServices: {
          services: '/api/v1/services',
          serviceById: '/api/v1/services/:serviceId',
          quote: '/api/v1/services/:serviceId/quote',
          analytics: '/api/v1/services/analytics'
        },
        signup: '/api/signup',
        sections: '/api/sections',
        security: '/api/security',
        prelaunch: '/api/prelaunch'
      }
    });
  });
}





// Handle root API URL redirect for unauthorized users
app.get('/api', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || '';
  const origin = req.headers.origin;
  
  // Check if this is a frontend request
  if (origin === 'https://www.packmovego.com' || origin === 'https://packmovego.com') {
    return res.json({
      message: 'PackMoveGO REST API',
      status: 'running',
      endpoints: {
        health: '/api/health',
        data: '/api/v0/:name',
        content: '/api/v0/*'
      }
    });
  }
  
  // Redirect unauthorized users to frontend
  console.log(`🚫 Unauthorized access to API root from IP: ${clientIp}, redirecting to frontend`);
  return res.redirect(302, 'https://www.packmovego.com');
});

// Detailed health check endpoint (for monitoring)
app.get('/health/detailed', (req, res) => {
  console.log(`✅ Health check request: ${req.path} from ${req.ip}`);
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});





// Catch-all for any other endpoints that might be coming without /api prefix
app.use('/*', (req, res, next) => {
  // Skip if it's already an API route or health check
  if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/') {
    return next();
  }
  
  // Skip /v0/ routes completely - let them be handled by the specific route handlers
  if (req.path.startsWith('/v0/')) {
    console.log(`✅ /v0/ route detected: ${req.path} - allowing to pass through`);
    return next();
  }
  
  // Check if this looks like it should be an API route
  if (req.path.startsWith('/data/') || req.path.startsWith('/signup') || 
      req.path.startsWith('/sections') || req.path.startsWith('/security') || req.path.startsWith('/prelaunch')) {
    console.log(`🔄 Redirecting API-like request: ${req.path} to /api${req.path}`);
    return res.redirect(308, `/api${req.path}`);
  }
  
  next();
});

// Return 403 Forbidden for non-API requests (except root)
app.get('*', (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Access Forbidden',
    error: 'This endpoint is not available',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.log(`❌ API endpoint not found: ${req.path} - Method: ${req.method} - IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      '/api/health',
      '/api/data/:name',
      '/api/v0/blog',
      '/api/v0/about',
      '/api/v0/nav',
      '/api/v0/contact',
      '/api/v0/referral',
      '/api/v0/reviews',
      '/api/v0/locations',
      '/api/v0/supplies',
      '/api/v0/services',
      '/api/v0/testimonials',
      '/api/v1/services',
      '/api/v1/services/:serviceId',
      '/api/v1/services/:serviceId/quote',
      '/api/v1/services/analytics',
      '/api/signup',
      '/api/sections',
      '/api/security',
      '/api/prelaunch'
    ]
  });
});

// Error handling middleware with proper status codes
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server Error:', err.stack);
  console.error('❌ Error details:', {
    name: err.name,
    message: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Determine appropriate status code based on error type
  let statusCode = 500;
  let errorMessage = 'Something went wrong!';
  
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation failed';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorMessage = 'Unauthorized access';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorMessage = 'Access forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorMessage = 'Resource not found';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    errorMessage = 'Resource conflict';
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    errorMessage = 'Too many requests';
  } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
    statusCode = 503;
    errorMessage = 'Database service unavailable';
  } else if (err.name === 'SyntaxError') {
    statusCode = 400;
    errorMessage = 'Invalid request format';
  }
  
  // Don't send error details in production
  const errorDetails = process.env.NODE_ENV === 'development' ? {
    message: err.message,
    stack: err.stack
  } : undefined;
  
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error: errorDetails,
    timestamp: new Date().toISOString()
  });
});

// Start server
server = app.listen(port, () => {
  console.log('🚀 === PackMoveGO REST API Server ===');
  console.log(`📡 API Server: http://localhost:${port}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('📋 === Available API Endpoints ===');
  console.log(`✅ Health Check: http://localhost:${port}/api/health`);
  console.log(`📊 Data API: http://localhost:${port}/api/data/:name`);
  console.log(`📝 Content APIs: /api/v0/blog, /api/v0/about, /api/v0/nav, /api/v0/contact, /api/v0/referral`);
  console.log(`📝 Content APIs: /api/v0/reviews, /api/v0/locations, /api/v0/supplies, /api/v0/services, /api/v0/testimonials`);
  console.log(`🚀 Enhanced Services: /api/v1/services, /api/v1/services/:serviceId/quote, /api/v1/services/analytics`);
  console.log(`👤 User Routes: http://localhost:${port}/api/signup`);
  console.log(`📑 Section Routes: http://localhost:${port}/api/sections`);
  console.log(`🔒 Security Routes: http://localhost:${port}/api/security`);
  console.log(`🚀 Prelaunch Routes: http://localhost:${port}/api/prelaunch`);
  console.log('🌍 === CORS Configuration ===');
  console.log(`✅ Origins: ${allowedCorsOrigins.join(', ')}`);
  console.log(`✅ Methods: ${corsOptions.methods.join(', ')}`);
  console.log(`✅ Headers: ${corsOptions.allowedHeaders.join(', ')}`);
  console.log('⚙️ === Service Status ===');

  // Check MongoDB connection
  const dbStatus = getConnectionStatus();
  const mongoStatus = dbStatus ? '✅ Connected' : '❌ Not connected';
  console.log(`📦 MongoDB: ${mongoStatus}`);

  // Check Prisma connection
  let prismaStatus = '❌ Not configured';
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.$connect();
      prisma.$disconnect();
      prismaStatus = '✅ Connected';
    } catch (error) {
      prismaStatus = '❌ Connection failed';
    }
  }
  console.log(`🔗 Prisma: ⚠️ Not used (MongoDB active)`);

  // Check JWT configuration
  const jwtStatus = process.env.JWT_SECRET ? '✅ Configured' : '❌ Not configured';
  console.log(`🔒 JWT: ${jwtStatus}`);

  // Check Stripe configuration
  const stripeStatus = process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Not configured';
  console.log(`💳 Stripe: ${stripeStatus}`);

  // Check Email configuration
  const emailStatus = process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured';
  console.log(`📧 Email: ${emailStatus}`);

  // Check IP Whitelist
  const ipWhitelistStatus = '❌ Disabled (public API)';
  console.log(`🔐 IP Whitelist: ${ipWhitelistStatus}`);

  console.log('🎯 === REST API Ready ===');
  console.log('📡 All endpoints served directly from this server');
  console.log('🔗 Ready to accept requests from any frontend');
  console.log('==================================================');
});

// Start SSH server only in development
console.log(`🔧 Environment check: envConfig.NODE_ENV = "${envConfig.NODE_ENV}", process.env.NODE_ENV = "${process.env.NODE_ENV}"`);

if (envConfig.NODE_ENV === 'development' || process.env.NODE_ENV === 'development') {
  try {
    sshServer.listen(SSH_CONFIG.PORT, SSH_CONFIG.HOST, () => {
      logInfo(`🔐 SSH Server started on ${SSH_CONFIG.HOST}:${SSH_CONFIG.PORT}`);
      logInfo(`📋 SSH Configuration:`);
      logInfo(`   - Environment: ${envConfig.NODE_ENV}`);
      logInfo(`   - Allowed IPs: ${envConfig.ALLOWED_IPS.join(', ')}`);
      logInfo(`   - Max Connections: ${SSH_CONFIG.MAX_CONNECTIONS}`);
      logInfo(`   - Session Timeout: ${SSH_CONFIG.SESSION_TIMEOUT} minutes`);
      logInfo(`   - Render Mode: ${SSH_CONFIG.RENDER_ENV ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    logError('❌ Failed to start SSH server:', error);
  }
} else {
  logInfo('🔐 SSH Server disabled in production (frontend on Vercel)');
}