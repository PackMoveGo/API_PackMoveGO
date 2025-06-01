import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import signupRoutes from './route/signup';
import sectionRoutes from './route/sectionRoutes';
import securityRoutes from './route/securityRoutes';
import dotenv from 'dotenv';
import path from 'path';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { vercelIpWhitelist } from './middleware/ipWhitelist';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Connect to MongoDB
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:5000'],
  methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
  allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization').split(','),
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Apply IP whitelist middleware to all API routes
app.use('/api', vercelIpWhitelist);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    environment: process.env.NODE_ENV,
    corsOrigin: corsOptions.origin,
    corsMethods: corsOptions.methods,
    corsHeaders: corsOptions.allowedHeaders,
    port: port
  });
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', signupRoutes);
app.use('/api', sectionRoutes);
app.use('/api', securityRoutes);

// Development mode: Proxy frontend requests to Vite dev server
if (isDevelopment) {
  const proxyOptions = {
    target: 'http://localhost:5000',
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    pathRewrite: {
      '^/api': '/api', // Don't rewrite API paths
    },
    onProxyReq: (proxyReq: express.Request, req: express.Request, res: express.Response) => {
      // Don't proxy API requests
      if (req.path.startsWith('/api/')) {
        return;
      }
    }
  };

  app.use('/', createProxyMiddleware(proxyOptions) as RequestHandler);
} else {
  // Production mode: API server only
  app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to PackMoveGO API',
      version: '1.0.0',
      status: 'running'
    });
  });
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(port, () => {
  console.log('\n=== Server Configuration ===');
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\n=== CORS Configuration ===');
  console.log(`🌐 CORS Origins: ${corsOptions.origin.join(', ')}`);
  console.log(`🔧 CORS Methods: ${corsOptions.methods.join(', ')}`);
  console.log(`🔑 CORS Headers: ${corsOptions.allowedHeaders.join(', ')}`);
  console.log('\n=== Database Configuration ===');
  console.log(`📦 MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log(`🔗 Prisma: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
  console.log('\n=== Security Configuration ===');
  console.log(`🔒 JWT: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
  console.log('\n=== Email Configuration ===');
  console.log(`📧 Email: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
}).on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Please try a different port or close the application using this port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
}); 