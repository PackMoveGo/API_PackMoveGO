import { Router } from 'express';
// import { getDataFile } from '../controllers/dataController'; // Unused import
import path from 'path';
import fs from 'fs';

const router = Router();

// Specific handler for /v0/health endpoint
router.get('/health', (req, res) => {
  // Set CORS headers
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  
  // Return health status
  const uptime = typeof process.uptime === 'function' ? Math.floor(process.uptime()) : 0;
  return res.status(200).json({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    environment: process.env['NODE_ENV'] || 'development'
  });
});

// Handle OPTIONS for /health endpoint
router.options('/health', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.status(200).end();
});

// Specific handler for /nav/footer endpoint
router.get('/nav/footer', (req, res) => {
  const origin=req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  
  const dataDir=path.join(__dirname, '../database');
  const filePath=path.join(dataDir, 'nav.json');
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ 
        success: false,
        message: 'Data file not found',
        error: 'Navigation data could not be loaded',
        timestamp: new Date().toISOString()
      });
    }
    
    try {
      const parsedData=JSON.parse(data);
      // Return only footer navigation
      return res.status(200).json({
        footerNav: parsedData.footerNav || parsedData.mainNav || []
      });
    } catch (e) {
      return res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: 'Invalid JSON format in navigation data',
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Specific handler for /recentMoves/total endpoint
router.get('/recentMoves/total', (req, res) => {
  // Set CORS headers
  const origin=req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  
  const dataDir=path.join(__dirname, '../database');
  const filePath=path.join(dataDir, 'totalMoves.json');
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ 
        success: false,
        message: 'Data file not found',
        error: 'The total moves count could not be loaded',
        timestamp: new Date().toISOString()
      });
    }
    
    try {
      const parsedData=JSON.parse(data);
      return res.status(200).json(parsedData);
    } catch (e) {
      return res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: 'Invalid JSON format in data file',
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Generic handler for all /v0/* endpoints
// @ts-ignore - Callback-based async pattern, response sent in callback
router.get('/:name', (req, res) => {
  // Extract the name from the URL (e.g., /v0/nav -> nav)
  const { name } = req.params;
  
  // Validate input
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid request',
      error: 'Missing or invalid data name parameter',
      timestamp: new Date().toISOString()
    });
  }
  
  // Map of allowed files with their actual filenames (for case sensitivity)
  // Note: 'reviews' and 'referral' are now handled by controllers, not static files
  const fileMap: Record<string, string> = {
    'nav': 'nav.json',
    'contact': 'contact.json',
    'blog': 'blog.json',
    'locations': 'locations.json',
    'supplies': 'supplies.json',
    'services': 'services.json',
    'serviceareas': 'serviceAreas.json',
    'testimonials': 'Testimonials.json',  // Capital T in filename
    'about': 'about.json',
    'recentmoves': 'recentMoves.json'
  };
  
  // Normalize name to lowercase for case-insensitive lookup
  const normalizedName = name.toLowerCase();
  const actualFilename = fileMap[normalizedName];
  
  if (!actualFilename) {
    return res.status(404).json({ 
      success: false,
      message: 'Data file not found',
      error: `Requested data file '${name}' does not exist`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Set CORS headers for all /v0 endpoints
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  
  // Construct file path using actual filename
  const dataDir = path.join(__dirname, '../database');
  const filePath = path.join(dataDir, actualFilename);
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).json({ 
        success: false,
        message: 'Data file not found',
        error: 'The requested data file could not be loaded',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // All files in fileMap are JSON
      try {
        const parsedData = JSON.parse(data);
        res.status(200).json(parsedData);
        return;
      } catch (e) {
        res.status(500).json({ 
          success: false,
          message: 'Server error',
          error: 'Invalid JSON format in data file',
          timestamp: new Date().toISOString()
        });
        return;
    }
  });
  // Callback-based async - response sent in callback, function returns void
});

// Handle OPTIONS for /recentMoves/total endpoint
router.options('/recentMoves/total', (req, res) => {
  const origin=req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.status(200).end();
});

// Handle OPTIONS for all /v0 endpoints
router.options('/:name', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.status(200).end();
});

export default router;
