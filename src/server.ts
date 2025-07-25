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
import { validateEnvironment } from './config/envValidation';
import logger, { logInfo, logError, logWarn } from './util/logger';
import { setupSwagger } from './config/swagger';
// Import SSH server but don't start it immediately
import { sshServer, SSH_CONFIG } from './ssh/sshServer';

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
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost:5001',
    ...envConfig.CORS_ORIGIN
  ].filter((origin, index, arr) => arr.indexOf(origin) === index), // Remove duplicates
  methods: envConfig.CORS_METHODS,
  allowedHeaders: envConfig.CORS_ALLOWED_HEADERS,
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

// IP check middleware for login and dashboard routes
app.use(['/login', '/dashboard'], (req, res, next) => {
  // Use the same IP detection method as auth middleware
  let clientIp = 'unknown';
  
  if (req.headers['x-forwarded-for']) {
    const xff = req.headers['x-forwarded-for'];
    clientIp = (typeof xff === 'string' ? xff : xff[0])?.split(',')[0]?.trim() || 'unknown';
  } else if (req.headers['x-real-ip']) {
    clientIp = req.headers['x-real-ip'] as string;
  } else if (req.connection.remoteAddress) {
    clientIp = req.connection.remoteAddress;
  } else if (req.socket.remoteAddress) {
    clientIp = req.socket.remoteAddress;
  } else if (req.ip) {
    clientIp = req.ip;
  }
  
  console.log(`🔐 IP check for ${req.path}: ${clientIp}`);
  
  // Allow frontend requests
  if (req.headers.origin === 'https://www.packmovego.com' || req.headers.origin === 'https://packmovego.com') {
    console.log(`✅ Frontend request allowed for ${req.path}`);
    return next();
  }
  
  // Check if IP is in allowed list
  const allowedIps = process.env.ALLOWED_IPS?.split(',') || [];
  console.log(`🔍 Checking IP ${clientIp} against allowed IPs: ${allowedIps.join(', ')}`);
  
  if (!allowedIps.includes(clientIp)) {
    console.log(`🚫 Unauthorized IP ${clientIp} trying to access ${req.path}, redirecting to frontend`);
    return res.redirect(302, 'https://www.packmovego.com');
  }
  
  console.log(`✅ Authorized IP ${clientIp} accessing ${req.path}`);
  next();
});

// Serve login and dashboard pages BEFORE global auth middleware
app.get('/login', (req, res) => {
  // Use a more reliable path resolution for production
  const loginPagePath = path.join(process.cwd(), 'src', 'view', 'login.html');
  console.log(`🔐 Serving login page from: ${loginPagePath}`);
  
  if (fs.existsSync(loginPagePath)) {
    res.sendFile(loginPagePath);
  } else {
    console.error(`❌ Login page not found at: ${loginPagePath}`);
    // Send a simple login page as fallback
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head><title>PackMoveGO - Admin Login</title></head>
      <body>
        <h1>PackMoveGO Admin Login</h1>
        <p>Your IP is authorized. Please enter the admin password:</p>
        <form action="/api/auth/login" method="POST">
          <input type="password" name="password" placeholder="Admin Password" required>
          <button type="submit">Login</button>
        </form>
        <p><small>Debug: Login page not found at ${loginPagePath}</small></p>
      </body>
      </html>
    `);
  }
});

app.get('/dashboard', (req, res) => {
  // Use a more reliable path resolution for production
  const dashboardPath = path.join(process.cwd(), 'src', 'view', 'dashboard.html');
  console.log(`📊 Serving dashboard from: ${dashboardPath}`);
  
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    console.error(`❌ Dashboard not found at: ${dashboardPath}`);
    res.status(404).send('Dashboard page not found');
  }
});

// Debug route to check file structure
app.get('/debug', (req, res) => {
  const cwd = process.cwd();
  const srcPath = path.join(cwd, 'src');
  const viewPath = path.join(srcPath, 'view');
  const loginPath = path.join(viewPath, 'login.html');
  
  res.json({
    cwd,
    srcExists: fs.existsSync(srcPath),
    viewExists: fs.existsSync(viewPath),
    loginExists: fs.existsSync(loginPath),
    files: fs.existsSync(viewPath) ? fs.readdirSync(viewPath) : [],
    loginPath
  });
});

// Apply authentication middleware globally in production
if (process.env.NODE_ENV === 'production') {
  app.use(authMiddleware);
}

// Apply IP whitelist only to sensitive routes, not globally
// app.use(ipWhitelist); // Commented out to allow public access

// Basic middleware
app.use(cors(corsOptions));
app.use(cookieParser());
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

// Health check endpoint - optimized for Render
app.get('/api/health', (req, res) => {
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

// === DEVELOPMENT MODE FIXES ===
if (envConfig.NODE_ENV !== 'production') {
  // 1. Serve /v0/* routes directly, no redirect
  const v0DataFiles = [
    'blog', 'about', 'nav', 'contact', 'referral', 'reviews', 'locations', 'supplies', 'services', 'testimonials'
  ];
  app.get(['/v0/:name', '/v0/:name/'], (req, res, next) => {
    const { name } = req.params;
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
  // Use the same IP detection method as other middleware
  let clientIp = 'unknown';
  
  if (req.headers['x-forwarded-for']) {
    const xff = req.headers['x-forwarded-for'];
    clientIp = (typeof xff === 'string' ? xff : xff[0])?.split(',')[0]?.trim() || 'unknown';
  } else if (req.headers['x-real-ip']) {
    clientIp = req.headers['x-real-ip'] as string;
  } else if (req.connection.remoteAddress) {
    clientIp = req.connection.remoteAddress;
  } else if (req.socket.remoteAddress) {
    clientIp = req.socket.remoteAddress;
  } else if (req.ip) {
    clientIp = req.ip;
  }
  
  console.log(`🔐 Root endpoint access from IP: ${clientIp}`);
  
  // Allow frontend requests
  if (req.headers.origin === 'https://www.packmovego.com' || req.headers.origin === 'https://packmovego.com') {
    console.log(`✅ Frontend request to root, returning API info`);
    const dbStatus = getConnectionStatus();
    return res.status(200).json({
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
  }
  
  // Check if IP is in allowed list
  const allowedIps = process.env.ALLOWED_IPS?.split(',') || [];
  console.log(`🔍 Checking IP ${clientIp} against allowed IPs: ${allowedIps.join(', ')}`);
  
  if (!allowedIps.includes(clientIp)) {
    console.log(`🚫 Unauthorized IP ${clientIp} accessing root, redirecting to frontend`);
    return res.redirect(302, 'https://www.packmovego.com');
  }
  
  // Authorized IP - redirect to login
  console.log(`✅ Authorized IP ${clientIp} accessing root, redirecting to login`);
  return res.redirect(302, '/login');
});

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

// Simple test endpoint
app.get('/health', (req, res) => {
  console.log(`✅ Health check request: ${req.path} from ${req.ip}`);
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Additional simple health check for Render
app.get('/api/health/simple', (req, res) => {
  console.log(`✅ Simple health check request: ${req.path} from ${req.ip}`);
  res.status(200).json({
    status: 'ok',
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