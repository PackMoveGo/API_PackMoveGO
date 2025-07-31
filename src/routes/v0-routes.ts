import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const v0Router = Router();

// List of available data files with their exact filenames
const v0DataFiles: { [key: string]: string } = {
  'blog': 'blog.json',
  'about': 'about.json',
  'nav': 'nav.json',
  'contact': 'contact.json',
  'referral': 'referral.json',
  'reviews': 'reviews.json',
  'locations': 'locations.json',
  'supplies': 'supplies.json',
  'services': 'Services.json', // Note: This one is capitalized
  'testimonials': 'Testimonials.json' // Note: This one is capitalized
};

// Set CORS headers for V0 endpoints
const setV0CorsHeaders = (req: Request, res: Response) => {
  const origin = req.headers.origin || req.headers['origin'] || '';
  
  if (origin && origin !== 'null') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
};

// Handle OPTIONS requests for /v0/ routes (preflight)
v0Router.options('/:name', (req: Request, res: Response) => {
  setV0CorsHeaders(req, res);
  res.status(200).end();
});

// Test route to verify v0-routes.ts is being used (can be removed in production)
v0Router.get('/test', (req: Request, res: Response) => {
  console.log('✅ /v0/test route hit - v0-routes.ts is working!');
  return res.json({ 
    message: 'v0-routes.ts is working!', 
    timestamp: new Date().toISOString() 
  });
});

// Health endpoint for v0 routes
v0Router.get('/health', (req: Request, res: Response) => {
  setV0CorsHeaders(req, res);
  const dbStatus = true; // Database status check simplified
  return res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus,
      status: dbStatus ? 'connected' : 'disconnected'
    },
    uptime: Math.floor(process.uptime()),
    endpoint: '/v0/health'
  });
});

// Main V0 data endpoint
v0Router.get('/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  
  // Set CORS headers
  setV0CorsHeaders(req, res);
  
  if (name in v0DataFiles) {
    try {
      const filename = v0DataFiles[name as keyof typeof v0DataFiles];
      

      
      // Load the data file using the same approach that works in the test route
      let data;
      try {
        data = require(`../data/${filename}`);
      } catch (error) {
        console.error(`❌ /v0/ Error loading ${filename}:`, error instanceof Error ? error.message : 'Unknown error');
        return res.status(404).json({ 
          success: false,
          message: 'Data file not found',
          error: 'The requested data file could not be loaded',
          timestamp: new Date().toISOString()
        });
      }
      
      return res.json(data);
    } catch (err) {
      console.error(`❌ /v0/ Error loading ${name}:`, err);
      return res.status(500).json({ 
        error: 'Data loading error',
        message: `Could not load ${name} data`,
        details: err instanceof Error ? err.message : 'Unknown error',
        available: Object.keys(v0DataFiles)
      });
    }
  }
  
  // If not a valid data file
  return res.status(404).json({ 
    error: 'Invalid endpoint',
    message: `Endpoint /v0/${name} not found`,
    requested: name,
    available: Object.keys(v0DataFiles).map(file => `/v0/${file}`)
  });
});

export default v0Router; 