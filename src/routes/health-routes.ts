import { Router, Request, Response } from 'express';
import { getConnectionStatus } from '../config/database';

const healthRouter = Router();

// === IMMEDIATE HEALTH CHECK (for Render) ===
healthRouter.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

healthRouter.get('/health/simple', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check with timeout protection
healthRouter.get('/health/detailed', (req: Request, res: Response) => {
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
    const response = {
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      serverPort: process.env.PORT,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      // Only include detailed metrics if not a Render health check
      ...(req.get('User-Agent') !== 'Render/1.0' && {
        memory: process.memoryUsage(),
        database: {
          connected: getConnectionStatus(),
          status: getConnectionStatus() ? 'connected' : 'disconnected'
        }
      })
    };
    
    clearTimeout(healthCheckTimeout);
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Health check error:', error);
    clearTimeout(healthCheckTimeout);
    res.status(200).json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  }
});

export default healthRouter; 