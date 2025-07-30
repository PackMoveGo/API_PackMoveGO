import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { log } from './util/console-logger';

const app = express();
const PORT = process.env.PORT || 3000;
const PRIVATE_API_URL = process.env.PRIVATE_API_URL || 'http://localhost:3000';

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'https://www.packmovego.com',
    'https://packmovego.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  log.info('gateway', `${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin')
  });
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    log.info('gateway', `Response ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      responseTime: `${responseTime}ms`
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'gateway',
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

// Proxy configuration
const proxyOptions = {
  target: PRIVATE_API_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // Keep /api prefix
    '^/v0': '/v0',   // Keep /v0 prefix
    '^/data': '/data' // Keep /data prefix
  },
  onProxyReq: (proxyReq: any, req: any, res: any) => {
    // Add gateway headers
    proxyReq.setHeader('X-Gateway-Service', 'pack-go-movers-gateway');
    proxyReq.setHeader('X-Original-Host', req.get('Host'));
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    
    log.debug('gateway', `Proxying to ${PRIVATE_API_URL}${proxyReq.path}`);
  },
  onProxyRes: (proxyRes: any, req: any, res: any) => {
    // Add gateway response headers
    res.setHeader('X-Gateway-Service', 'pack-go-movers-gateway');
    res.setHeader('X-Proxied-By', 'gateway');
    
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
app.use('/api', createProxyMiddleware(proxyOptions));
app.use('/v0', createProxyMiddleware(proxyOptions));
app.use('/data', createProxyMiddleware(proxyOptions));
app.use('/signup', createProxyMiddleware(proxyOptions));
app.use('/sections', createProxyMiddleware(proxyOptions));
app.use('/security', createProxyMiddleware(proxyOptions));
app.use('/prelaunch', createProxyMiddleware(proxyOptions));
app.use('/services', createProxyMiddleware(proxyOptions));
app.use('/analytics', createProxyMiddleware(proxyOptions));
app.use('/load-balancer', createProxyMiddleware(proxyOptions));
app.use('/internal', createProxyMiddleware(proxyOptions));

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

// Start server
app.listen(parseInt(PORT.toString()), '0.0.0.0', () => {
  log.info('gateway', `🚀 Gateway service started on port ${PORT}`);
  log.info('gateway', `📡 Proxying to private API: ${PRIVATE_API_URL}`);
  log.info('gateway', `🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  log.info('gateway', `🌍 CORS Origins: ${process.env.CORS_ORIGIN || 'default'}`);
});

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