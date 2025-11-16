/**
 * Centralized Route Configuration
 * Extracted from server.ts for better organization
 */

import{Application} from 'express';
import signupRoutes from '../routes/signup';
import sectionRoutes from '../routes/sectionRoutes';
import securityRoutes from '../routes/securityRoutes';
import dataRoutes from '../routes/dataRoutes';
import servicesRoutes from '../routes/servicesRoutes';
import analyticsRoutes from '../routes/analyticsRoutes';
import v0Routes from '../routes/v0-routes';
import bookingRoutes from '../routes/bookingRoutes';
import chatRoutes from '../routes/chatRoutes';
import paymentRoutes from '../routes/paymentRoutes';
import contactRoutes from '../routes/contactRoutes';
import referralRoutes from '../routes/referralRoutes';
import reviewRoutes from '../routes/reviewRoutes';
import quoteRoutes from '../routes/quoteRoutes';
import geolocationRoutes from '../routes/geolocation';
import authRouterAlt from '../routes/authRoutes-alt';
import subscriptionRouter from '../routes/subscriptionRoutes';
import workflowRouter from '../routes/workflowRoutes';
import searchRoutes from '../routes/searchRoutes';
import arcjetMiddleware from '../middlewares/arcjet-middleware';

/**
 * Mount all application routes
 */
export function configureRoutes(app:Application):void{
  // Core business routes
  app.use('/signup',signupRoutes);
  app.use('/sections',sectionRoutes);
  app.use('/security',securityRoutes);

  // SSD_Alt merged routes (with Arcjet protection)
  app.use('/v0/auth',arcjetMiddleware,authRouterAlt);
  app.use('/auth',arcjetMiddleware,authRouterAlt); // Alias for /auth/* to work without /v0 prefix
  app.use('/v0/subscriptions',arcjetMiddleware,subscriptionRouter);
  app.use('/v0/workflows',arcjetMiddleware,workflowRouter);
  app.use('/v0/search',searchRoutes);

  // Handle /api/v0/* requests and redirect to /v0/*
  app.use('/api/v0',(req,_res,next)=>{
    const newUrl=req.url.replace('/api/v0','/v0');
    console.log(`🔄 API redirect: ${req.url} -> ${newUrl}`);
    req.url=newUrl;
    next();
  });

  // Specific handler for common frontend requests
  app.get('/api/v0/nav.json',(req,res)=>{
    console.log(`📡 Frontend nav request: ${req.method} ${req.path} from ${req.ip}`);
    return res.redirect('/v0/nav');
  });

  // Contact, referral, review, and quote routes (MongoDB-based)
  // These must be mounted BEFORE v0Routes catch-all to ensure proper matching
  app.use('/v0/contact',contactRoutes);
  app.use('/v0/referral',referralRoutes);
  app.use('/v0/reviews',reviewRoutes);
  app.use('/v0/quotes',quoteRoutes);

  // V0 content routes (catch-all must come after specific routes)
  app.use('/v0',v0Routes);

  // Geolocation proxy route
  app.use('/v0',geolocationRoutes);

  // Public API routes - alias for /v0/* endpoints
  app.use('/public',(req,res,next)=>{
    req.url=req.url.replace(/^\/public/,'/v0');
    v0Routes(req,res,next);
  });

  // Uber-like application routes
  app.use('/v1/bookings',bookingRoutes);
  app.use('/v1/chat',chatRoutes);
  app.use('/v1/payments',paymentRoutes);

  // Data and services routes
  app.use('/data',dataRoutes);
  app.use('/services',servicesRoutes);
  app.use('/analytics',analyticsRoutes);
}

export default configureRoutes;

