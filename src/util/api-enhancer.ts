import express from 'express';
import { Request, Response, NextFunction } from 'express';

export interface APIEnhancerConfig {
  enableCompression?: boolean;
  enableCaching?: boolean;
  enableRateLimiting?: boolean;
  enableSecurityHeaders?: boolean;
  enableRequestLogging?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableErrorHandling?: boolean;
  corsOrigins?: string[];
  rateLimitWindow?: number;
  rateLimitMax?: number;
  cacheTTL?: number;
}

export class APIEnhancer {
  private config: APIEnhancerConfig;

  constructor(config: APIEnhancerConfig = {}) {
    this.config = {
      enableCompression: true,
      enableCaching: true,
      enableRateLimiting: true,
      enableSecurityHeaders: true,
      enableRequestLogging: true,
      enablePerformanceMonitoring: true,
      enableErrorHandling: true,
      corsOrigins: ['https://www.packmovego.com', 'https://packmovego.com'],
      rateLimitWindow: 15 * 60 * 1000, // 15 minutes
      rateLimitMax: 100,
      cacheTTL: 300, // 5 minutes
      ...config
    };
  }

  /**
   * Apply all enhancements to the Express app
   */
  applyEnhancements(app: express.Application): void {
    if (this.config.enableSecurityHeaders) {
      this.applySecurityHeaders(app);
    }

    if (this.config.enableRequestLogging) {
      this.applyRequestLogging(app);
    }

    if (this.config.enablePerformanceMonitoring) {
      this.applyPerformanceMonitoring(app);
    }

    if (this.config.enableRateLimiting) {
      this.applyRateLimiting(app);
    }

    if (this.config.enableCaching) {
      this.applyCaching(app);
    }

    if (this.config.enableErrorHandling) {
      this.applyErrorHandling(app);
    }
  }

  /**
   * Apply comprehensive security headers
   */
  private applySecurityHeaders(app: express.Application): void {
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      // CORS headers
      const origin = req.headers.origin;
      if (origin && this.config.corsOrigins?.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Vary', 'Origin');

      next();
    });
  }

  /**
   * Apply request logging middleware
   */
  private applyRequestLogging(app: express.Application): void {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const timestamp = new Date().toISOString();
      const method = req.method;
      const path = req.path;
      const userAgent = req.get('User-Agent') || 'Unknown';
      const origin = req.get('Origin') || 'Unknown';
      const ip = req.ip || req.socket.remoteAddress || 'Unknown';

      console.log(`[${timestamp}] ${method} ${path} - Origin: ${origin} - IP: ${ip} - User-Agent: ${userAgent}`);

      res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const isError = status >= 400;
        
        if (isError) {
          console.error(`❌ ${method} ${path} - Status: ${status} - Time: ${duration}ms`);
        } else {
          console.log(`✅ ${method} ${path} - Status: ${status} - Time: ${duration}ms`);
        }
      });

      next();
    });
  }

  /**
   * Apply performance monitoring
   */
  private applyPerformanceMonitoring(app: express.Application): void {
    const metrics = {
      requests: 0,
      errors: 0,
      responseTimes: [] as number[],
      startTime: Date.now()
    };

    app.use((_req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      metrics.requests++;

      res.on('finish', () => {
        const duration = Date.now() - start;
        metrics.responseTimes.push(duration);
        
        if (res.statusCode >= 400) {
          metrics.errors++;
        }

        // Keep only last 1000 response times
        if (metrics.responseTimes.length > 1000) {
          metrics.responseTimes.shift();
        }
      });

      next();
    });

    // Add metrics endpoint
    app.get('/api/metrics', (_req: Request, res: Response) => {
      const avgResponseTime = metrics.responseTimes.length > 0 
        ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length 
        : 0;

      res.json({
        uptime: Date.now() - metrics.startTime,
        requests: metrics.requests,
        errors: metrics.errors,
        errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0,
        avgResponseTime: Math.round(avgResponseTime),
        minResponseTime: metrics.responseTimes.length > 0 ? Math.min(...metrics.responseTimes) : 0,
        maxResponseTime: metrics.responseTimes.length > 0 ? Math.max(...metrics.responseTimes) : 0
      });
    });
  }

  /**
   * Apply rate limiting
   */
  private applyRateLimiting(app: express.Application): void {
    const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

    app.use((req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const windowStart = now - this.config.rateLimitWindow!;

      // Clean old entries
      for (const [key, value] of rateLimitStore.entries()) {
        if (value.resetTime < windowStart) {
          rateLimitStore.delete(key);
        }
      }

      const current = rateLimitStore.get(ip);
      
      if (!current || current.resetTime < windowStart) {
        rateLimitStore.set(ip, { count: 1, resetTime: now });
      } else if (current.count >= this.config.rateLimitMax!) {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((current.resetTime + this.config.rateLimitWindow! - now) / 1000)
        });
      } else {
        current.count++;
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.rateLimitMax!.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.rateLimitMax! - (current?.count || 0)).toString());
      res.setHeader('X-RateLimit-Reset', new Date(current?.resetTime || now).toISOString());

      return next();
    });
  }

  /**
   * Apply response caching
   */
  private applyCaching(app: express.Application): void {
    const cache = new Map<string, { data: any; timestamp: number }>();

    app.use((req: Request, res: Response, next: NextFunction) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
      const cached = cache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp) < (this.config.cacheTTL! * 1000)) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached.data);
      }

      // Override res.json to cache responses
      const originalJson = res.json;
      res.json = function(data: any) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
        res.setHeader('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    });
  }

  /**
   * Apply comprehensive error handling
   */
  private applyErrorHandling(app: express.Application): void {
    // 404 handler
    app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
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
      const errorDetails = process.env['NODE_ENV'] === 'development' ? {
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
  }

  /**
   * Get API health status
   */
  getHealthStatus(): object {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env['NODE_ENV'] || 'development'
    };
  }
}

export default APIEnhancer; 