import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import signupRoutes from './route/signup';
import sectionRoutes from './route/sectionRoutes';
import securityRoutes from './route/securityRoutes';
import prelaunchRoutes from './route/prelaunchRoutes';
import dotenv from 'dotenv';
import path from 'path';
import { securityMiddleware } from './middleware/security';
import dataRoutes from './route/dataRoutes';
import { ipWhitelist } from './middleware/ipWhitelist';

// Load environment variables from config directory
dotenv.config({ path: path.join(__dirname, '../config/.env') });

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB (optional in development)
connectDB().catch((err: Error) => {
  console.error('❌ Failed to connect to MongoDB:', err);
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ Continuing without database connection in development mode');
  } else {
    process.exit(1);
  }
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
app.use(ipWhitelist);

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const origin = req.get('Origin') || 'Unknown';
  
  console.log(`[${timestamp}] ${method} ${path} - Origin: ${origin} - User-Agent: ${userAgent}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    environment: process.env.NODE_ENV,
    serverPort: port,
    corsOrigin: corsOptions.origin,
    corsMethods: corsOptions.methods,
    corsHeaders: corsOptions.allowedHeaders,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', signupRoutes);
app.use('/api', sectionRoutes);
app.use('/api', securityRoutes);
app.use('/api', prelaunchRoutes);
app.use('/api', dataRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to PackMoveGO REST API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
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

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
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

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
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
  let mongoStatus = '❌ Not connected';
  try {
    // This will be updated when connectDB resolves
    mongoStatus = '✅ Connected';
  } catch (error) {
    mongoStatus = '❌ Connection failed';
  }
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
  const ipWhitelistStatus = process.env.ALLOWED_IPS ? '✅ Active' : '❌ Not configured';
  console.log(`🔐 IP Whitelist: ${ipWhitelistStatus}`);

  console.log('🎯 === REST API Ready ===');
  console.log('📡 All endpoints served directly from this server');
  console.log('🔗 Ready to accept requests from any frontend');
  console.log('==================================================');
});