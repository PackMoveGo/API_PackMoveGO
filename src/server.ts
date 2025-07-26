import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB, getConnectionStatus } from './config/database';
import signupRoutes from './route/signup';
import sectionRoutes from './route/sectionRoutes';
import securityRoutes from './route/securityRoutes';
import prelaunchRoutes from './route/prelaunchRoutes';
import authRoutes from './route/authRoutes';
// SSH routes will be imported conditionally
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
import { errorHandler, requestIdMiddleware } from './middleware/error-handler';
import { apiPerformanceMonitor } from './util/api-performance';
// SSH server completely disabled for production
// import { startSSHServer } from './ssh/sshServer';

// Conditional imports to avoid build errors
let validateEnvironment: any;
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

// === MOBILE-FRIENDLY CORS CONFIGURATION ===
// This must be applied BEFORE any other middleware to ensure mobile requests work

// Universal CORS middleware for all requests
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers['origin'] || '';
  const userAgent = req.headers['user-agent'] || '';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  
  // Enhanced mobile detection
  const isMobile = userAgent.includes('Mobile') || 
                   userAgent.includes('iPhone') || 
                   userAgent.includes('Android') || 
                   userAgent.includes('iPad') ||
                   userAgent.includes('Safari') || 
                   userAgent.includes('Chrome') || 
                   userAgent.includes('Firefox') ||
                   userAgent.includes('Edge') ||
                   userAgent.includes('Opera');
  
  // Log all requests for debugging
  console.log(`🌐 REQUEST: ${req.method} ${req.path} from ${clientIp}`);
  console.log(`   Origin: "${origin || 'None'}"`);
  console.log(`   User-Agent: "${userAgent.substring(0, 100) || 'None'}"`);
  console.log(`   Mobile: ${isMobile ? 'Yes' : 'No'}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  // UNIVERSAL CORS HEADERS FOR ALL REQUESTS
  // This ensures mobile devices can access the API regardless of origin
  if (origin && origin !== 'null') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`✅ CORS: Set origin header for ${origin}`);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`✅ CORS: Set wildcard origin header`);
  }
  
  // Essential CORS headers for mobile compatibility
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With,Accept,Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Vary', 'Origin');
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log(`🔄 PREFLIGHT: Handling OPTIONS request for ${req.path}`);
    res.status(200).end();
    return;
  }
  
  // Mark mobile requests for other middleware
  if (isMobile) {
    (req as any).isMobile = true;
    console.log(`📱 MOBILE REQUEST DETECTED: ${userAgent.substring(0, 50)}`);
  }
  
  // Log response completion
  res.on('finish', () => {
    console.log(`✅ RESPONSE: ${req.method} ${req.path} - Status: ${res.statusCode} - Mobile: ${isMobile ? 'Yes' : 'No'} - Completed at ${new Date().toISOString()}`);
  });
  
  next();
});

// === STATIC FILE SERVING FOR MOBILE DEBUG ===
// Serve mobile debug page
app.get('/mobile-debug.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../mobile-debug.html'));
});

// Serve phone debug page
app.get('/phone-debug.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../phone-debug.html'));
});

// === MOBILE-SPECIFIC ENDPOINTS ===
// These endpoints are designed specifically for mobile devices
// IMPORTANT: These must be defined BEFORE the catch-all middleware

// Mobile health check - ULTRA SIMPLE
app.get('/mobile/health', (req, res) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  
  console.log(`📱 MOBILE HEALTH: Request from ${clientIp} - ${userAgent.substring(0, 50)}`);
  
  // Set CORS headers for mobile - ALWAYS allow
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  res.status(200).json({
    status: 'ok',
    mobile: true,
    userAgent: userAgent.substring(0, 100),
    timestamp: new Date().toISOString(),
    backend: 'active',
    ip: clientIp,
    message: 'Mobile API is working!'
  });
});

// Mobile API endpoint - ALWAYS ALLOWS MOBILE DEVICES
app.get('/mobile/api', (req, res) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  const origin = req.headers.origin || 'Unknown';
  
  console.log(`📱 MOBILE API: Request from ${clientIp}`);
  console.log(`   User-Agent: ${userAgent.substring(0, 80)}`);
  console.log(`   Origin: ${origin}`);
  console.log(`   Path: ${req.path}`);
  
  // Set CORS headers for mobile - ALWAYS allow
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  res.status(200).json({
    success: true,
    message: 'Mobile API endpoint is working!',
    mobile: true,
    userAgent: userAgent.substring(0, 100),
    ip: clientIp,
    origin: origin,
    timestamp: new Date().toISOString(),
    server: 'PackMoveGo API',
    version: '1.0.0'
  });
});

// Mobile debug endpoint - provides detailed information
app.get('/mobile/debug', (req, res) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  const origin = req.headers.origin || 'Unknown';
  const referer = req.headers.referer || 'Unknown';
  
  console.log(`📱 MOBILE DEBUG: Request from ${clientIp}`);
  console.log(`   User-Agent: ${userAgent}`);
  console.log(`   Origin: ${origin}`);
  console.log(`   Referer: ${referer}`);
  
  // Set CORS headers for mobile - ALWAYS allow
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  res.status(200).json({
    success: true,
    debug: {
      userAgent: userAgent,
      ip: clientIp,
      origin: origin,
      referer: referer,
      headers: req.headers,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
      server: 'PackMoveGo API',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '3000'
    }
  });
});

// Mobile data endpoint - serves your actual data
app.get('/mobile/data/:type', (req, res) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  const dataType = req.params.type;
  
  console.log(`📱 MOBILE DATA: Request for ${dataType} from ${clientIp}`);
  
  // Set CORS headers for mobile - ALWAYS allow
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  // Try to load the requested data
  try {
    const dataPath = path.join(__dirname, `../src/data/${dataType}.json`);
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      res.status(200).json({
        success: true,
        data: data,
        type: dataType,
        mobile: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Data type '${dataType}' not found`,
        availableTypes: ['about', 'blog', 'contact', 'locations', 'nav', 'referral', 'reviews', 'Services', 'supplies', 'Testimonials'],
        mobile: true,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`❌ Error loading data for ${dataType}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error loading data',
      error: error instanceof Error ? error.message : String(error),
      mobile: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple mobile endpoint
app.get('/mobile', (req, res) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  console.log(`📱 SIMPLE MOBILE: Request from ${clientIp} - ${userAgent.substring(0, 50)}`);
  
  // Set CORS headers for mobile - ALWAYS allow
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  res.status(200).json({
    message: 'Mobile API working',
    timestamp: new Date().toISOString(),
    userAgent: userAgent.substring(0, 50),
    ip: clientIp
  });
});

// ULTRA-SIMPLE MOBILE TEST - NO RESTRICTIONS
app.get('/mobile/test', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    message: 'Mobile test endpoint working',
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
});

// === ENHANCED /v0/ ROUTES WITH MOBILE SUPPORT ===
// These routes now have better mobile compatibility

// Define v0DataFiles array (moved to avoid duplication)
const v0DataFiles = [
  'blog', 'about', 'nav', 'contact', 'referral', 'reviews', 'locations', 'supplies', 'services', 'testimonials'
];

// Handle OPTIONS requests for /v0/ routes (preflight)
app.options(['/v0/:name', '/v0/:name/'], (req, res) => {
  const origin = req.headers.origin || req.headers['origin'];
  const referer = req.headers.referer || req.headers['referer'];
  
  console.log(`🔧 /v0/ OPTIONS CORS CHECK: ${req.method} ${req.path} - Origin: "${origin}" - Referer: "${referer}"`);
  
  // Set CORS headers for all origins (mobile-friendly)
  if (origin && origin !== 'null') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`✅ /v0/ OPTIONS CORS: Set origin header for ${origin}`);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`✅ /v0/ OPTIONS CORS: Set wildcard origin header`);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  console.log(`✅ /v0/ OPTIONS CORS headers set!`);
  res.status(200).end();
});

app.get(['/v0/:name', '/v0/:name/'], (req, res, next) => {
  const { name } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  
  // MOBILE LOGGING
  const isMobile = userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android');
  console.log(`📱 /v0/ REQUEST: ${req.method} ${req.path} from ${clientIp}`);
  console.log(`   Mobile: ${isMobile ? 'Yes' : 'No'}`);
  console.log(`   User-Agent: "${userAgent.substring(0, 80)}"`);
  
  // UNIVERSAL CORS FOR MOBILE - ALWAYS SET HEADERS
  const origin = req.headers.origin || req.headers['origin'] || '';
  if (origin && origin !== 'null') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`✅ /v0/ CORS: Set origin header for ${origin}`);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`✅ /v0/ CORS: Set wildcard origin header`);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  console.log(`✅ /v0/ CORS: Universal headers set for mobile`);
  
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
    if (!origin || origin === 'null') {
      console.log(`✅ CORS: Allowing request with no origin or null origin`);
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log(`✅ CORS: Allowing localhost: ${origin}`);
      return callback(null, true);
    }
    
    // Allow any IP address for mobile testing
    if (origin.match(/^https?:\/\/\d+\.\d+\.\d+\.\d+/)) {
      console.log(`✅ CORS: Allowing IP address for mobile testing: ${origin}`);
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
    
    // For mobile testing, allow all origins
    console.log(`✅ CORS: Allowing origin for mobile testing: ${origin}`);
    return callback(null, true);
  },
  methods: envConfig.CORS_METHODS || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: envConfig.CORS_ALLOWED_HEADERS || ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};



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

// Global CORS middleware - MOBILE FRIENDLY
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers['origin'];
  const referer = req.headers.referer || req.headers['referer'];
  
  console.log(`🌐 GLOBAL CORS CHECK: ${req.method} ${req.path}`);
  console.log(`   Origin: "${origin}" (type: ${typeof origin})`);
  console.log(`   Referer: "${referer}"`);
  
  // Set CORS headers for all requests (mobile-friendly)
  if (origin && origin !== 'null') {
    console.log(`🔧 GLOBAL CORS: Setting headers for origin: ${origin}`);
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Vary', 'Origin');
    console.log(`✅ GLOBAL CORS headers set!`);
  } else {
    // For requests with no origin or null origin (mobile browsers)
    console.log(`🔧 GLOBAL CORS: Setting wildcard headers for mobile`);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Vary', 'Origin');
    console.log(`✅ GLOBAL CORS wildcard headers set!`);
  }
  
  next();
});

// Basic middleware (after CORS)
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// COMPREHENSIVE MOBILE-FRIENDLY API - NO RESTRICTIONS
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers['origin'] || '';
  const userAgent = req.headers['user-agent'] || '';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  
  // COMPREHENSIVE MOBILE LOGGING
  console.log(`📱 MOBILE CHECK: ${req.method} ${req.path}`);
  console.log(`   Origin: "${origin || 'None'}"`);
  console.log(`   User-Agent: "${userAgent.substring(0, 100) || 'None'}"`);
  console.log(`   IP: "${clientIp}"`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  // DETECT MOBILE DEVICES
  const isMobile = userAgent.includes('Mobile') || 
                   userAgent.includes('iPhone') || 
                   userAgent.includes('Android') || 
                   userAgent.includes('iPad') ||
                   userAgent.includes('Safari') || 
                   userAgent.includes('Chrome') || 
                   userAgent.includes('Firefox') ||
                   userAgent.includes('Edge');
  
  if (isMobile) {
    console.log(`📱 MOBILE DEVICE DETECTED: ${userAgent.substring(0, 50)}`);
  }
  
  // UNIVERSAL CORS FOR ALL REQUESTS (MOBILE FRIENDLY)
  console.log(`✅ UNIVERSAL CORS: Setting headers for all requests`);
  
  // Always set CORS headers regardless of origin
  if (origin && origin !== 'null') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`✅ CORS: Set origin header for ${origin}`);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`✅ CORS: Set wildcard origin header`);
  }
  
  // Essential CORS headers for mobile
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Vary', 'Origin');
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log(`🔄 PREFLIGHT: Handling OPTIONS request for ${req.path}`);
    res.status(200).end();
    return;
  }
  
  // Log response completion
  res.on('finish', () => {
    console.log(`✅ RESPONSE: ${req.method} ${req.path} - Status: ${res.statusCode} - Mobile: ${isMobile ? 'Yes' : 'No'} - Completed at ${new Date().toISOString()}`);
  });
  
  // ALL REQUESTS ALLOWED - NO AUTHENTICATION
  console.log(`✅ MOBILE API: All requests allowed - No authentication required`);
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

// ENHANCED CORS FOR ALL REQUESTS - KEEPS BACKEND ALIVE
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin || req.headers['origin'] || '';
  const referer = req.headers.referer || req.headers['referer'] || '';
  const userAgent = req.headers['user-agent'] || '';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  
  // KEEP-ALIVE LOGGING FOR RENDER
  console.log(`🌐 KEEP-ALIVE: ${req.method} ${req.path} from ${clientIp}`);
  console.log(`   Origin: "${requestOrigin || 'None'}"`);
  console.log(`   Referer: "${referer || 'None'}"`);
  console.log(`   User-Agent: "${userAgent.substring(0, 80) || 'None'}"`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  // Set CORS headers for ALL requests to keep backend alive
  if (requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    console.log(`✅ CORS: Set origin header for ${requestOrigin}`);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`✅ CORS: Set wildcard origin header`);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Vary', 'Origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`🔄 PREFLIGHT: Handling OPTIONS request for ${req.path}`);
    res.status(200).end();
    return;
  }
  
  // Log response completion
  res.on('finish', () => {
    console.log(`✅ RESPONSE: ${req.method} ${req.path} - Status: ${res.statusCode} - Completed at ${new Date().toISOString()}`);
  });
  
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
app.use('/api/ssh', sshRoutes); // SSH routes will be imported conditionally

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
  const userAgent = req.headers['user-agent'] || '';
  
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
  
  // Check if this is a mobile request
  const isMobile = userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android');
  if (isMobile) {
    console.log(`📱 MOBILE API ACCESS: ${userAgent.substring(0, 50)} from ${clientIp}`);
    return res.json({
      message: 'PackMoveGO Mobile API',
      status: 'running',
      mobile: true,
      endpoints: {
        nav: '/v0/nav',
        services: '/v0/services',
        testimonials: '/v0/testimonials',
        heartbeat: '/api/heartbeat'
      }
    });
  }
  
  // Redirect unauthorized users to frontend
  console.log(`🚫 Unauthorized access to API root from IP: ${clientIp}, redirecting to frontend`);
  return res.redirect(302, 'https://www.packmovego.com');
});

// MOBILE TEST ENDPOINT - DEFINED EARLY
app.get('/api/mobile-test', (req, res) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  const origin = req.headers.origin || req.headers['origin'] || 'None';
  
  console.log(`📱 MOBILE TEST: Request from ${clientIp}`);
  console.log(`   User-Agent: ${userAgent.substring(0, 100)}`);
  console.log(`   Origin: ${origin}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  const isMobile = userAgent.includes('Mobile') || 
                   userAgent.includes('iPhone') || 
                   userAgent.includes('Android') || 
                   userAgent.includes('iPad');
  
  res.status(200).json({
    success: true,
    message: 'Mobile connectivity test successful',
    mobile: isMobile,
    userAgent: userAgent.substring(0, 100),
    origin: origin,
    timestamp: new Date().toISOString(),
    backend: 'active'
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
  
  // Skip mobile endpoints - allow them to pass through
  if (req.path.startsWith('/mobile/')) {
    console.log(`✅ Mobile route detected: ${req.path} - allowing to pass through`);
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

// Return 403 Forbidden for non-API requests (except root and mobile endpoints)
// TEMPORARILY DISABLED TO FIX MOBILE API ISSUES
/*
app.get('*', (req, res) => {
  // Skip if it's an API route that should be handled by 404 handler
  if (req.path.startsWith('/api/')) {
    return; // Let the 404 handler take care of it
  }
  
  // Skip mobile endpoints
  if (req.path === '/mobile') {
    return; // Let the mobile endpoint handler take care of it
  }
  
  // Skip health endpoints
  if (req.path === '/health' || req.path === '/health/detailed') {
    return; // Let the health endpoint handlers take care of it
  }
  
  // Skip root endpoint
  if (req.path === '/') {
    return; // Let the root endpoint handler take care of it
  }
  
  // Skip v0 endpoints
  if (req.path.startsWith('/v0/')) {
    return; // Let the v0 endpoint handlers take care of it
  }
  
  // Only block requests that don't match any known patterns
  res.status(403).json({
    success: false,
    message: 'Access Forbidden',
    error: 'This endpoint is not available',
    timestamp: new Date().toISOString()
  });
});
*/

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
      '/api/mobile-test',
      '/api/heartbeat',
      '/api/ping',
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

// Start server - explicitly bind to IPv4 for mobile compatibility
server = app.listen(port, '0.0.0.0', () => {
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
  
  // PERIODIC KEEP-ALIVE LOGGING FOR RENDER
  setInterval(() => {
    console.log(`💚 BACKEND ALIVE: Server running for ${Math.floor(process.uptime())}s - ${new Date().toISOString()}`);
  }, 60000); // Log every minute
});

// Start SSH server only in development
console.log(`🔧 Environment check: envConfig.NODE_ENV = "${envConfig.NODE_ENV}", process.env.NODE_ENV = "${process.env.NODE_ENV}"`);

// SSH Server disabled to avoid key file issues
console.log('🔐 SSH Server disabled - key file missing');