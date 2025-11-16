/**
 * Centralized Middleware Configuration
 * Extracted from server.ts for better organization
 */

import express,{Application} from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import{securityMiddleware} from '../middlewares/security';
import{optionalAuth} from '../middlewares/authMiddleware';
import{createCORSJWT} from '../middlewares/cors-jwt';
import{performanceMiddleware} from '../util/performance-monitor';
import{advancedRateLimiter,burstProtection} from '../util/api-limiter';
import{userTracker} from '../util/user-tracker';
import{sessionLogger} from '../util/session-logger';
import{config} from '../../config/env';

const localNetwork=config.LOCAL_NETWORK;

/**
 * Configure all middleware for the application
 */
export function configureMiddleware(app:Application):void{
  // Trust proxy for rate limiting behind load balancers
  app.set('trust proxy',1);

  // Session logging middleware (logs all requests with timestamps)
  app.use(sessionLogger.middleware());

  // Security and performance middleware (order matters)
  app.use(securityMiddleware);
  app.use(compression());
  app.use(performanceMiddleware);
  app.use(advancedRateLimiter);
  app.use(burstProtection);

  // CORS configuration
  const allowedCorsOrigins=[
    'https://www.packmovego.com',
    'https://packmovego.com',
    'https://api.packmovego.com',
    `http://${localNetwork}:5173`,
    `http://${localNetwork}:5000`,
    `http://${localNetwork}:5001`,
    `http://${localNetwork}:3000`,
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost:5001',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5001',
    'http://127.0.0.1:3000'
  ];

  const corsJWT=createCORSJWT({
    jwtSecret:config.JWT_SECRET,
    allowedOrigins:allowedCorsOrigins,
    publicEndpoints:[
      '/health','/api/health','/api/health/simple',
      '/v0/blog','/v0/about','/v0/nav','/v0/contact',
      '/v0/referral','/v0/reviews','/v0/locations',
      '/v0/supplies','/v0/services','/v0/testimonials',
      '/data/nav','/data/blog','/data/about',
      '/data/contact','/data/referral','/data/reviews',
      '/data/locations','/data/supplies','/data/services',
      '/data/testimonials','/v1/services',
      '/auth/verify','/','/api','/api/'
    ],
    optionalAuthEndpoints:[
      '/auth/login','/auth/register','/auth/verify',
      '/auth/me','/auth/admin','/auth/profile',
      '/auth/users','/signup','/prelaunch/register'
    ]
  });

  app.use(corsJWT.middleware);

  // Request logging middleware with user tracking
  app.use((req,res,next)=>{
    const startTime=Date.now();
    const timestamp=new Date().toISOString();
    const method=req.method;
    const path=req.path;
    const userAgent=req.get('User-Agent')||'Unknown';
    const origin=req.get('Origin')||'Unknown';
    const ip=req.ip||req.socket.remoteAddress||'Unknown';
    const requestId=req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    
    // Get or create user session
    const userSession=userTracker.getUserSession(req);
    const userDisplay=userTracker.getUserDisplay(userSession);
    
    // Log ALL requests
    console.log(`[${timestamp}] ${method} ${path} - ${userDisplay} - IP: ${ip} - Origin: ${origin} - User-Agent: ${userAgent} - RequestID: ${requestId}`);
    
    (req as any).requestId=requestId;
    res.setHeader('X-Request-ID',requestId);
    
    res.on('finish',()=>{
      const responseTime=Date.now()-startTime;
      const statusCode=res.statusCode;
      const isError=statusCode>=400;
      
      if(isError){
        console.error(`❌ [${timestamp}] ${method} ${path} - ${userDisplay} - Status: ${statusCode} - Time: ${responseTime}ms - RequestID: ${requestId}`);
      }else{
        console.log(`✅ [${timestamp}] ${method} ${path} - ${userDisplay} - Status: ${statusCode} - Time: ${responseTime}ms - RequestID: ${requestId}`);
      }
    });
    
    next();
  });

  // Basic middleware
  app.use(cookieParser(config.API_KEY_FRONTEND,{decode:decodeURIComponent}));

  app.use((req,res,next)=>{
    const clientCookie=req.cookies.server_client;
    if(!clientCookie||clientCookie!=='frontend_server'){
      res.cookie('server_client','frontend_server',{
        httpOnly:true,
        secure:config.isProduction,
        sameSite:'strict'
      });
    }
    next();
  });

  app.use(express.json({limit:'10mb'}));
  app.use(express.urlencoded({extended:true,limit:'10mb'}));

  // Request timeout middleware
  app.use((req,res,next)=>{
    const timeout=setTimeout(()=>{
      if(!res.headersSent){
        console.warn(`⚠️ Request timeout for ${req.method} ${req.path}`);
        res.status(408).json({
          success:false,
          message:'Request timeout',
          timestamp:new Date().toISOString()
        });
      }
    },30000);

    res.on('finish',()=>{
      clearTimeout(timeout);
    });

    next();
  });

  // JWT middleware
  app.use(optionalAuth);
}

export default configureMiddleware;

