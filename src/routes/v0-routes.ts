import { Router } from 'express';
import { getDataFile } from '../controllers/dataController';
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
    environment: process.env.NODE_ENV || 'development'
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
  
  // Only allow specific files for security
  // Note: 'health' is handled by a specific route handler above
  const allowedFiles = [
    'nav', 'contact', 'referral', 'blog', 'reviews', 'locations', 'supplies', 'services', 'Testimonials', 'about', 'recentMoves'
  ];
  
  if (!allowedFiles.includes(name)) {
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
  
  // about.txt is a text file, others are JSON
  const ext = name === 'about' ? '.txt' : '.json';
  const dataDir = path.join(__dirname, '../database');
  const filePath = path.join(dataDir, name + ext);
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ 
        success: false,
        message: 'Data file not found',
        error: 'The requested data file could not be loaded',
        timestamp: new Date().toISOString()
      });
    }
    
    if (ext === '.json') {
      try {
        const parsedData = JSON.parse(data);
        return res.status(200).json(parsedData);
      } catch (e) {
        return res.status(500).json({ 
          success: false,
          message: 'Server error',
          error: 'Invalid JSON format in data file',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      return res.status(200).type('text/plain').send(data);
    }
  });
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
