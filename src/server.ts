import express from 'express';
import cors from 'cors';
import { connectDB, getConnectionStatus } from './config/database';
import signupRoutes from './route/signup';
import sectionRoutes from './route/sectionRoutes';
import securityRoutes from './route/securityRoutes';
import prelaunchRoutes from './route/prelaunchRoutes';
import dotenv from 'dotenv';
import path from 'path';
import { securityMiddleware } from './middleware/security';
import dataRoutes from './route/dataRoutes';
import { ipWhitelist } from './middleware/ipWhitelist';
import serverMonitor from './util/monitor';

// Load environment variables from config directory
dotenv.config({ path: path.join(__dirname, '../config/.env') });

const app = express();
const port = process.env.PORT || 3000;

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  // Don't exit immediately, let the server try to handle it
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit immediately, let the server try to handle it
});

// Graceful shutdown handling
let server: any;

const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close((err: any) => {
      if (err) {
        console.error('❌ Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
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
  console.error('❌ Failed to connect to MongoDB:', err);
  console.log('⚠️ Continuing without database connection');
});

// CORS configuration for REST API
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost:5001',
    'https://www.packmovego.com',
    'https://packmovego.com',
    ...(process.env.CORS_ORIGIN?.split(',') || [])
  ].filter((origin, index, arr) => arr.indexOf(origin) === index), // Remove duplicates
  methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
  allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization').split(','),
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Apply security middleware first
app.use(securityMiddleware);

// Apply IP whitelist only to sensitive routes, not globally
// app.use(ipWhitelist); // Commented out to allow public access

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log(`✅ API Health check request: ${req.path} from ${req.ip}`);
  const metrics = serverMonitor.getMetrics();
  
  res.status(200).json({ 
    status: 'ok',
    environment: process.env.NODE_ENV,
    serverPort: port,
    uptime: metrics.uptime,
    memory: metrics.memory,
    database: metrics.database,
    requests: metrics.requests,
    corsOrigin: corsOptions.origin,
    corsMethods: corsOptions.methods,
    corsHeaders: corsOptions.allowedHeaders,
    timestamp: new Date().toISOString()
  });
});

// API Routes with proper status codes
app.use('/api', signupRoutes);
app.use('/api', sectionRoutes);
app.use('/api', securityRoutes);
app.use('/api', prelaunchRoutes);
app.use('/api', dataRoutes);

// Catch-all for v0 endpoints without /api prefix (for proxy configurations)
app.use('/v0/*', (req, res) => {
  console.log(`🔄 Redirecting v0 request: ${req.path} to /api${req.path}`);
  res.redirect(308, `/api${req.path}`);
});

// Catch-all for any other endpoints that might be coming without /api prefix
app.use('/*', (req, res, next) => {
  // Skip if it's already an API route or health check
  if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/') {
    return next();
  }
  
  // Check if this looks like it should be an API route
  if (req.path.startsWith('/v0/') || req.path.startsWith('/data/') || req.path.startsWith('/signup') || 
      req.path.startsWith('/sections') || req.path.startsWith('/security') || req.path.startsWith('/prelaunch')) {
    console.log(`🔄 Redirecting API-like request: ${req.path} to /api${req.path}`);
    return res.redirect(308, `/api${req.path}`);
  }
  
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  const dbStatus = getConnectionStatus();
  res.status(200).json({
    message: 'Welcome to PackMoveGO REST API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
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
        blog: '/api/v0/blog',
        about: '/api/v0/about',
        nav: '/api/v0/nav',
        contact: '/api/v0/contact',
        referral: '/api/v0/referral',
        reviews: '/api/v0/reviews',
        locations: '/api/v0/locations',
        supplies: '/api/v0/supplies',
        services: '/api/v0/services',
        testimonials: '/api/v0/testimonials'
      },
      signup: '/api/signup',
      sections: '/api/sections',
      security: '/api/security',
      prelaunch: '/api/prelaunch'
    }
  });
});

// Simple test endpoint
app.get('/health', (req, res) => {
  console.log(`✅ Health check request: ${req.path} from ${req.ip}`);
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
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
  console.log(`👤 User Routes: http://localhost:${port}/api/signup`);
  console.log(`📑 Section Routes: http://localhost:${port}/api/sections`);
  console.log(`🔒 Security Routes: http://localhost:${port}/api/security`);
  console.log(`🚀 Prelaunch Routes: http://localhost:${port}/api/prelaunch`);
  console.log('🌍 === CORS Configuration ===');
  console.log(`✅ Origins: ${corsOptions.origin.join(', ')}`);
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