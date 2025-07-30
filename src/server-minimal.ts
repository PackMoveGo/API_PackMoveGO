import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { securityMiddleware } from './middleware/security';
import { createCORSJWT } from './middleware/cors-jwt';
import SocketUtils from './util/socket-utils';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config/.env') });

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://www.packmovego.com',
      'https://packmovego.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const port = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Security middleware
app.use(securityMiddleware);

// CORS JWT configuration
const corsJWT = createCORSJWT({
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
  allowedOrigins: [
    'https://www.packmovego.com',
    'https://packmovego.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  publicEndpoints: [
    '/health',
    '/api/health',
    '/v0/about',
    '/v0/services',
    '/v0/nav'
  ],
  optionalAuthEndpoints: [
    '/auth/login',
    '/auth/register'
  ]
});

app.use(corsJWT.middleware);

// Socket.IO setup
const socketUtils = new SocketUtils(io);

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Test endpoints for security
app.get('/v0/about', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'About PackMoveGO',
      description: 'Professional moving services'
    }
  });
});

app.get('/v0/services', (req, res) => {
  res.json({
    success: true,
    data: {
      services: [
        { name: 'Residential Moving', price: '$500+' },
        { name: 'Commercial Moving', price: '$1000+' }
      ]
    }
  });
});

app.get('/v0/nav', (req, res) => {
  res.json({
    success: true,
    data: {
      mainNav: [
        { name: 'Home', url: '/' },
        { name: 'Services', url: '/services' },
        { name: 'About', url: '/about' }
      ]
    }
  });
});

// Security test endpoint
app.get('/security/test', (req, res) => {
  res.json({
    success: true,
    message: 'Security test endpoint',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log('🚀 === PackMoveGO Security Test Server ===');
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('📋 === Available Endpoints ===');
  console.log(`✅ Health Check: http://localhost:${port}/health`);
  console.log(`🔒 Security Test: http://localhost:${port}/security/test`);
  console.log(`📊 Content APIs: /v0/about, /v0/services, /v0/nav`);
  console.log('🔐 Security features enabled');
  console.log('==================================================');
});

export default app; 