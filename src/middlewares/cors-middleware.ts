import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { corsOptions } from '../util/app-config-stub';

// Universal CORS middleware for all requests
export const universalCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || req.headers['origin'] || '';
  const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
  
  // Log requests for debugging
  console.log(`🌐 REQUEST: ${req.method} ${req.path} from ${clientIp}`);
  
  // UNIVERSAL CORS HEADERS FOR ALL REQUESTS
  if (origin && origin !== 'null') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Essential CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With,Accept,Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Vary', 'Origin');
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log(`🔄 PREFLIGHT: Handling OPTIONS request for ${req.path}`);
    res.status(200).end();
    return;
  }
  
  next();
};

// Standard CORS middleware using cors package
export const standardCorsMiddleware = cors(corsOptions);

// Debug CORS middleware for troubleshooting
export const debugCorsMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (process.env['NODE_ENV'] === 'development') {
    console.log(`🔍 CORS Debug: ${req.method} ${req.path}`);
    console.log(`   Origin: ${req.headers.origin || 'None'}`);
    console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'None'}`);
  }
  next();
}; 