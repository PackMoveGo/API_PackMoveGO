import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '../../../src/data');

export const getDataFile = (req: Request, res: Response) => {
  // Extract name from params or from URL path
  let { name } = req.params;
  // If name is not in params, extract it from the URL path
  if (!name) {
    const pathParts = req.path.split('/');
    name = pathParts[pathParts.length - 1]; // Get the last part of the path
  }
  
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
  const allowedFiles = [
    'nav', 'contact', 'referral', 'blog', 'reviews', 'locations', 'supplies', 'Services', 'Testimonials', 'about'
  ];
  if (!allowedFiles.includes(name)) {
    return res.status(404).json({ 
      success: false,
      message: 'Data file not found',
      error: `Requested data file '${name}' does not exist`,
      timestamp: new Date().toISOString()
    });
  }
  
  // about.txt is a text file, others are JSON
  const ext = name === 'about' ? '.txt' : '.json';
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
        return res.status(200).json({
          success: true,
          data: parsedData,
          timestamp: new Date().toISOString()
        });
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
  return; // Explicit return for TypeScript
}; 