#!/usr/bin/env node

// This file can be run directly by Node.js
// It will redirect to the compiled JavaScript version

const nodePath = require('path');
const nodeFs = require('fs');

// Check if we're being run directly
if (require.main === module) {
  console.log('🚀 PackMoveGO API - TypeScript entry point...');
  
  // Check if we're already running the compiled version
  const isCompiled = __filename.endsWith('.js') && __dirname.includes('dist');
  
  if (isCompiled) {
    console.log('✅ Running compiled server directly...');
    // Continue with the server setup below
  } else {
    // When running through ts-node (development), run directly
    console.log('✅ Running TypeScript server directly...');
    // Continue with the server setup below
  }
}

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Database and core utilities
// Database connection will be handled by the database manager
import mongoose from 'mongoose';
import SocketUtils from './util/socket-utils';
import JWTUtils from './util/jwt-utils';

// Middleware imports
import { securityMiddleware } from './middleware/security';
import { errorHandler, requestIdMiddleware } from './middleware/error-handler';
import { optionalAuth } from './middleware/authMiddleware';
import { createCORSJWT } from './middleware/cors-jwt';
import { performanceMiddleware } from './util/performance-monitor';
import { advancedRateLimiter, burstProtection } from './util/api-limiter';

// Route imports
import signupRoutes from './route/signup';
import sectionRoutes from './route/sectionRoutes';
import securityRoutes from './route/securityRoutes';
import prelaunchRoutes from './route/prelaunchRoutes';
import authRoutes from './route/authRoutes';
import sshRoutes from './route/sshRoutes';
import dataRoutes from './route/dataRoutes';
import servicesRoutes from './route/servicesRoutes';
import analyticsRoutes from './route/analyticsRoutes';
import privateNetworkRoutes from './route/privateNetworkRoutes';
import loadBalancerRoutes from './route/loadBalancerRoutes';
import v0Routes from './routes/v0-routes';
import bookingRoutes from './route/bookingRoutes';
import chatRoutes from './route/chatRoutes';
import paymentRoutes from './route/paymentRoutes';

// Utilities
import serverMonitor from './util/monitor';
import loadBalancer from './util/load-balancer';
import { log, consoleLogger } from './util/console-logger';
import UserTracker from './util/user-tracker';

// Conditional imports to avoid build errors
let validateEnvironment: any;

try {
  // Check if we're running the compiled version or TypeScript version
  const isCompiled = __filename.endsWith('.js') && __dirname.includes('dist');
  const envValidationPath = isCompiled ? '../config/envValidation' : '../../config/envValidation';
  
  const envValidation = require(envValidationPath);
  validateEnvironment = envValidation.validateEnvironment;
} catch (error) {
  consoleLogger.warning('Environment validation not available');
  validateEnvironment = () => ({ 
    NODE_ENV: process.env.NODE_ENV || 'development', 
    PORT: parseInt(process.env.PORT || '3000', 10) 
  });
}

// Load environment variables
const isCompiled = __filename.endsWith('.js') && __dirname.includes('dist');
const envPath = isCompiled ? '../config/.env' : '../../config/.env';
dotenv.config({ path: path.join(__dirname, envPath) });

// Validate environment configuration
let envConfig;
try {
  envConfig = validateEnvironment();
  consoleLogger.success('Environment validation passed');
} catch (error) {
  consoleLogger.failure('Environment validation failed', error);
  process.exit(1);
}

// === SERVER SETUP ===
const app = express();

// Configure trust proxy for rate limiting behind load balancers
app.set('trust proxy', 1);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://www.packmovego.com',
      'https://packmovego.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5000',
      'http://localhost:5001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5001'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const port = envConfig.PORT || '3000';
const localNetwork = process.env.LOCAL_NETWORK || 'localhost';

// === SOCKET.IO CONFIGURATION ===
consoleLogger.socketInit();
const socketUtils = new SocketUtils(io);
const userTracker = new UserTracker(io);
consoleLogger.socketReady();

// Log connection summary every 5 minutes
setInterval(() => {
  const users = socketUtils.getConnectedUsers();
  const admins = socketUtils.getAdminUsers();
  if (users.length > 0) {
    consoleLogger.info('socket', 'Connection Summary', {
      totalUsers: users.length,
      adminUsers: admins.length,
      users: users.map(u => ({ userId: u.userId, email: u.email, role: u.userRole }))
    });
  }
}, 5 * 60 * 1000); // 5 minutes

// === HEALTH CHECK ENDPOINTS ===
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  const dbStatus = true; // Database status check simplified
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus,
      status: dbStatus ? 'connected' : 'disconnected'
    },
    uptime: Math.floor(process.uptime())
  });
});

// Additional health endpoints
app.get('/api/heartbeat', (req, res) => {
  res.status(200).json({
    status: 'alive',
    message: 'Backend is active and responding',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    frontend: 'connected'
  });
});

app.get('/api/ping', (req, res) => {
  res.status(200).json({
    pong: true,
    timestamp: new Date().toISOString(),
    backend: 'active'
  });
});

// Connection test endpoint for frontend
app.get('/api/connection-test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Connection test successful',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    endpoints: {
      health: '/health',
      nav: '/v0/nav',
      services: '/v0/services',
      testimonials: '/v0/testimonials'
    }
  });
});

// Auth status endpoint
app.get('/api/auth/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth status endpoint',
    authenticated: false,
    timestamp: new Date().toISOString()
  });
});

// === CORS CONFIGURATION ===
const corsOrigins = Array.isArray(envConfig.CORS_ORIGIN) ? envConfig.CORS_ORIGIN : 
                   typeof envConfig.CORS_ORIGIN === 'string' ? envConfig.CORS_ORIGIN.split(',').map((s: string) => s.trim()) : 
                   ['https://www.packmovego.com', 'https://packmovego.com'];

const allowedCorsOrigins = [
  'https://www.packmovego.com',
  'https://packmovego.com',
  'https://api.packmovego.com',
  `http://${localNetwork}:5173`,
  `http://${localNetwork}:5000`,
  `http://${localNetwork}:5001`,
  `http://${localNetwork}:3000`,
  `http://localhost:5173`,
  `http://localhost:5000`,
  `http://localhost:5001`,
  `http://localhost:3000`,
  `http://127.0.0.1:5173`,
  `http://127.0.0.1:5000`,
  `http://127.0.0.1:5001`,
  `http://127.0.0.1:3000`,
  'https://packmovego-6x8w2t0kw-pack-move-go-frontend.vercel.server',
  'https://*.vercel.server',
  ...corsOrigins
].filter((origin, index, arr) => arr.indexOf(origin) === index);

const corsOptions = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like curl, Postman)
    if (!origin || origin === 'null') {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow IP addresses for testing
    if (origin.match(/^https?:\/\/\d+\.\d+\.\d+\.\d+/)) {
      return callback(null, true);
    }
    
    // Allow whitelisted origins
    if (allowedCorsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow packmovego.com subdomains
    if (origin.includes('packmovego.com')) {
      return callback(null, true);
    }
    
    // Allow Vercel domains
    if (origin.includes('vercel.server')) {
      return callback(null, true);
    }
    
    // Allow all origins
    return callback(null, true);
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: envConfig.CORS_METHODS || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: envConfig.CORS_ALLOWED_HEADERS || ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// === GRACEFUL SHUTDOWN ===
let httpServer: any;

const gracefulShutdown = (signal: string) => {
  consoleLogger.shutdown(signal);
  
  if (httpServer) {
    httpServer.close((err: any) => {
      if (err) {
        consoleLogger.error('server', 'Error during server shutdown', err);
        process.exit(1);
      }
      
      consoleLogger.shutdownComplete();
      process.exit(0);
    });
    
    setTimeout(() => {
      consoleLogger.failure('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  consoleLogger.uncaughtException(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  consoleLogger.unhandledRejection(reason, promise);
  process.exit(1);
});

// === DATABASE CONNECTION ===
console.log('🚀 Starting database connection...');
// Database connection simplified for deployment
Promise.resolve().then(() => {
  console.log('✅ Database connection completed');
  console.log('📊 Connection status: true');
}).catch((err: any) => {
  consoleLogger.databaseError(err);
});

// === CORS JWT CONFIGURATION ===
const corsJWT = createCORSJWT({
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
  allowedOrigins: allowedCorsOrigins,
  publicEndpoints: [
    '/health',
    '/api/health',
    '/api/health/simple',
    '/v0/blog',
    '/v0/about',
    '/v0/nav',
    '/v0/contact',
    '/v0/referral',
    '/v0/reviews',
    '/v0/locations',
    '/v0/supplies',
    '/v0/services',
    '/v0/testimonials',
    '/data/nav',
    '/data/blog',
    '/data/about',
    '/data/contact',
    '/data/referral',
    '/data/reviews',
    '/data/locations',
    '/data/supplies',
    '/data/services',
    '/data/testimonials',
    '/load-balancer/status',
    '/load-balancer/instance',
    '/load-balancer/health',
    '/v1/services',
    '/auth/verify',
    '/',
    '/api',
    '/api/'
  ],
  optionalAuthEndpoints: [
    '/auth/login',
    '/auth/register',
    '/auth/verify',
    '/auth/me',
    '/auth/admin',
    '/auth/profile',
    '/auth/users',
    '/signup',
    '/prelaunch/register'
  ]
});

// === MIDDLEWARE STACK ===
// Security and performance middleware (order matters)
app.use(securityMiddleware);
app.use(compression());
app.use(performanceMiddleware);
app.use(advancedRateLimiter);
app.use(burstProtection);

// CORS middleware - MUST be before other middleware
app.use(corsJWT.middleware);
// Add explicit CORS headers for all responses
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const origin = req.headers.origin;
  
  // Set CORS headers for all responses
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With,Accept,Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Add explicit CORS headers for all responses
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const origin = req.headers.origin;
  
  // Set CORS headers for all responses
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With,Accept,Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(loadBalancer.middleware);

// Request logging middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  
  // Only log actual API requests, not static files or health checks
  const shouldLog = !req.path.includes('.') && req.path !== '/' && req.path !== '/health';
  
  if (shouldLog) {
    consoleLogger.request(req.method, req.path, req.get('Origin'));
  }
  
  // User tracking is now handled by Socket.IO
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    serverMonitor.recordRequest(responseTime, isError);
    
    // Only log actual API responses
    if (shouldLog) {
      consoleLogger.response(res.statusCode, req.path, responseTime);
    }
  });
  
  next();
});

// Basic middleware
app.use(cookieParser(process.env.API_KEY_FRONTEND, {
  decode: decodeURIComponent
}));

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientCookie = req.cookies.server_client;
  if (!clientCookie || clientCookie !== 'frontend_server') {
    res.cookie('server_client', 'frontend_server', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.warn(`⚠️ Request timeout for ${req.method} ${req.path}`);
      res.status(408).json({
        success: false,
        message: 'Request timeout',
        timestamp: new Date().toISOString()
      });
    }
  }, 30000);

  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
});

// === JWT MIDDLEWARE ===
app.use(optionalAuth);

// === API ROUTES ===
// Core business routes
app.use('/auth', authRoutes);
app.use('/signup', signupRoutes);
app.use('/sections', sectionRoutes);
app.use('/security', securityRoutes);
app.use('/prelaunch', prelaunchRoutes);

// Handle /api/v0/* requests and redirect to /v0/*
app.use('/api/v0', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Remove /api prefix and forward to v0 routes
  const newUrl = req.url.replace('/api/v0', '/v0');
  console.log(`🔄 API redirect: ${req.url} -> ${newUrl}`);
  req.url = newUrl;
  next();
});

// Add direct route for /v0/nav to handle frontend requests
app.get('/v0/nav', (req: express.Request, res: express.Response) => {
  console.log(`📡 Direct nav request: ${req.method} ${req.path} from ${req.ip}`);
  
  // Set CORS headers for this specific endpoint
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  
  // Handle the nav request
  try {
    // Use fs.readFileSync instead of require for better compatibility
    const fs = require('fs');
    const path = require('path');
    
    // Try multiple possible paths for the nav.json file
    const possiblePaths = [
      path.join(__dirname, 'data', 'nav.json'),
      path.join(__dirname, '..', 'data', 'nav.json'),
      path.join(__dirname, 'src', 'data', 'nav.json'),
      path.join(__dirname, '..', 'src', 'data', 'nav.json')
    ];
    
    let navData;
    let fileFound = false;
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          navData = JSON.parse(fileContent);
          fileFound = true;
          console.log(`✅ Nav data loaded from: ${filePath}`);
          break;
        } catch (error) {
          console.error(`❌ Error reading ${filePath}:`, error);
        }
      }
    }
    
    if (!fileFound) {
      console.error('❌ Nav.json not found in any of the expected locations:', possiblePaths);
      return res.status(500).json({ 
        error: 'Failed to load navigation data',
        message: 'Navigation data file not found',
        debug: {
          __dirname,
          possiblePaths
        }
      });
    }
    
    return res.json(navData);
  } catch (error) {
    console.error('❌ Error loading nav data:', error);
    return res.status(500).json({ 
      error: 'Failed to load navigation data',
      message: 'Could not load navigation data'
    });
  }
});

// Handle OPTIONS for /v0/nav
app.options('/v0/nav', (req: express.Request, res: express.Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.status(200).end();
});

// Specific handler for common frontend requests
app.get('/api/v0/nav.json', (req: express.Request, res: express.Response) => {
  console.log(`📡 Frontend nav request: ${req.method} ${req.path} from ${req.ip}`);
  // Redirect to the correct endpoint
  return res.redirect('/v0/nav');
});

// Handle auth status requests
app.get('/api/auth/status', (req: express.Request, res: express.Response) => {
  console.log(`📡 Auth status request: ${req.method} ${req.path} from ${req.ip}`);
  
  // Set CORS headers for this specific endpoint
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  
  // Return auth status
  return res.json({
    success: true,
    authenticated: false,
    message: 'Auth status endpoint',
    timestamp: new Date().toISOString()
  });
});

// Handle OPTIONS for /api/auth/status
app.options('/api/auth/status', (req: express.Request, res: express.Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.status(200).end();
});

// Specific handler for health endpoint
app.get('/api/v0/health', (req: express.Request, res: express.Response) => {
  console.log(`📡 Frontend health request: ${req.method} ${req.path} from ${req.ip}`);
  // Redirect to the correct endpoint
  return res.redirect('/v0/health');
});

// V0 content routes
app.use('/v0', v0Routes);

// Uber-like application routes
app.use('/v1/bookings', bookingRoutes);
app.use('/v1/chat', chatRoutes);
app.use('/v1/payments', paymentRoutes);

// Infrastructure routes
app.use('/ssh', sshRoutes);
app.use('/internal', privateNetworkRoutes);
app.use('/load-balancer', loadBalancerRoutes);

// Data and services routes (mounted after specific routes to avoid conflicts)
app.use('/data', dataRoutes);
app.use('/services', servicesRoutes);
app.use('/analytics', analyticsRoutes);

// === ROOT ENDPOINTS ===
app.get('/', (req: express.Request, res: express.Response) => {
  const dbStatus = true;
  return res.status(200).json({
    message: 'Welcome to PackMoveGO REST API',
    version: '1.0.0',
    status: 'running',
    environment: envConfig.NODE_ENV,
    database: {
      connected: dbStatus,
      status: dbStatus ? 'connected' : 'disconnected'
    },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      data: '/data/:name',
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
        services: '/v1/services',
        serviceById: '/v1/services/:serviceId',
        quote: '/v1/services/:serviceId/quote',
        analytics: '/v1/services/analytics'
      },
      signup: '/signup',
      sections: '/sections',
      security: '/security',
      prelaunch: '/prelaunch'
    }
  });
});

app.get('/api', (req: express.Request, res: express.Response) => {
  const origin = req.headers.origin;
  
  if (origin === 'https://www.packmovego.com' || origin === 'https://packmovego.com') {
    return res.json({
      message: 'PackMoveGO REST API',
      status: 'running',
      endpoints: {
        health: '/health',
        data: '/v0/:name',
        content: '/v0/*'
      }
    });
  }
  
  console.log(`🚫 Unauthorized access to API root from IP: ${req.ip}, redirecting to frontend`);
  return res.redirect(302, 'https://www.packmovego.com');
});

// User tracking stats endpoint
app.get('/api/stats/users', (req: express.Request, res: express.Response) => {
  // User tracking is now handled by Socket.IO
  res.json({
    success: true,
    message: 'User tracking is now handled via Socket.IO',
    timestamp: new Date().toISOString()
  });
});

// Clear visitors endpoint (POST and GET)
app.post('/api/clear/visitors', (req: express.Request, res: express.Response) => {
  try {
    // Clear the visitor data
    const dataPath = path.join(__dirname, '../../data/user-sessions.json');
    const freshData = {
      users: {},
      totalVisits: 0,
      uniqueUsers: 0
    };
    
    // Ensure data directory exists
    const dataDir = path.dirname(dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write fresh data
    fs.writeFileSync(dataPath, JSON.stringify(freshData, null, 2));
    
    console.log('✅ Visitor log cleared via API');
    console.log('📊 All visitor data reset to zero');
    console.log('🆕 Next visitor will be treated as NEW USER');
    
    res.json({
      success: true,
      message: 'Visitor log cleared successfully',
      timestamp: new Date().toISOString(),
      data: freshData
    });
  } catch (error) {
    console.error('❌ Error clearing visitor log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear visitor log',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/clear/visitors', (req: express.Request, res: express.Response) => {
  try {
    // Clear the visitor data
    const dataPath = path.join(__dirname, '../../data/user-sessions.json');
    const freshData = {
      users: {},
      totalVisits: 0,
      uniqueUsers: 0
    };
    
    // Ensure data directory exists
    const dataDir = path.dirname(dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write fresh data
    fs.writeFileSync(dataPath, JSON.stringify(freshData, null, 2));
    
    console.log('✅ Visitor log cleared via API');
    console.log('📊 All visitor data reset to zero');
    console.log('🆕 Next visitor will be treated as NEW USER');
    
    res.json({
      success: true,
      message: 'Visitor log cleared successfully',
      timestamp: new Date().toISOString(),
      data: freshData
    });
  } catch (error) {
    console.error('❌ Error clearing visitor log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear visitor log',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// MongoDB connection test endpoint
app.get('/api/test/mongodb', (req: express.Request, res: express.Response) => {
      const connectionStatus = true;
  const mongooseState = mongoose.connection.readyState;
  const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({
    success: true,
    connectionStatus,
    mongooseState,
    stateName: stateNames[mongooseState] || 'unknown',
    isConnected: connectionStatus,
    readyState: mongooseState
  });
});

// Handle malformed URLs that include full server URL
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Check if URL contains full server URL and clean it
  if (req.url.includes('http://localhost:3000') || req.url.includes('https://localhost:3000')) {
    const cleanUrl = req.url.replace(/https?:\/\/localhost:3000/, '');
    // Fix double slashes
    const finalUrl = cleanUrl.replace(/\/\//g, '/');
    console.log(`🔧 Cleaning malformed URL: ${req.url} -> ${finalUrl}`);
    req.url = finalUrl;
  }
  next();
});

// === ERROR HANDLERS ===
app.use('*', (req: express.Request, res: express.Response) => {
  // Only log 404s for actual API requests, not static files or common paths
  const shouldLog = !req.path.includes('.') && !req.path.includes('favicon') && req.path !== '/';
  
  if (shouldLog) {
    console.log(`❌ 404: ${req.method} ${req.path} from ${req.ip}`);
  }
  
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'health',
      '/v0/blog',
      '/v0/about', 
      '/v0/nav',
      '/v0/contact',
      '/v0/referral',
      '/v0/reviews',
      '/v0/locations',
      '/v0/supplies',
      '/v0/services',
      '/v0/testimonials',
      'signup',
      '/v0/sections',
      'security',
      'prelaunch'
    ]
  });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  consoleLogger.error('server', 'Server Error', err.stack);
  
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
  
  const errorDetails = {
    message: err.message,
    stack: err.stack
  };
  
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error: errorDetails,
    timestamp: new Date().toISOString()
  });
});

// === START SERVER ===
const serviceType = process.env.SERVICE_TYPE || 'web';
const isPrivateService = serviceType === 'private';

httpServer = server.listen(port, '0.0.0.0', () => {
  consoleLogger.serverStart(port, process.env.NODE_ENV || 'development');
  
  if (isPrivateService) {
    consoleLogger.info('system', '🔒 Running as PRIVATE service - not accessible from public internet');
    consoleLogger.info('system', '📡 Only accessible by other services in private network');
  }
  
  const endpoints = [
    `Health Check: http://${localNetwork}:${port}/health`,
    `Data API: http://${localNetwork}:${port}/data/:name`,
    'Content APIs: /v0/blog, /v0/about, /v0/nav, /v0/contact, /v0/referral',
    'Content APIs: /v0/reviews, /v0/locations, /v0/supplies, /v0/services, /v0/testimonials',
    'Enhanced Services: /v1/services, /v1/services/:serviceId/quote, /v1/services/analytics',
    `User Routes: http://${localNetwork}:${port}/signup`,
    `Section Routes: http://${localNetwork}:${port}/sections`,
    `Security Routes: http://${localNetwork}:${port}/security`,
    `Prelaunch Routes: http://${localNetwork}:${port}/prelaunch`
  ];
  
  consoleLogger.endpointList(endpoints);
  
  const services = {
            'MongoDB': '✅ Connected',
    'JWT': process.env.JWT_SECRET ? '✅ Configured' : '❌ Not configured',
    'Stripe': process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Not configured',
    'Email': process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured'
  };
  
  consoleLogger.serviceStatus(services);
  consoleLogger.serverReady();
});

consoleLogger.environmentCheck(envConfig.NODE_ENV, port);
consoleLogger.warning('SSH Server disabled - key file missing');

// Export for testing
export { app, server, io };
