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
  
  // Test data file accessibility
  const testFile = 'nav.json';
  const testPaths = [
    path.join(process.cwd(), 'dist', 'data', testFile),
    path.join(__dirname, 'data', testFile),
    path.join(process.cwd(), 'data', testFile),
    path.join(process.cwd(), 'src', 'data', testFile)
  ];
  
  const fileStatus = testPaths.map(testPath => ({
    path: testPath,
    exists: fs.existsSync(testPath),
    readable: fs.existsSync(testPath) ? 'Yes' : 'No'
  }));
  
  return res.json({ 
    message: 'v0-routes.ts is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    currentDir: process.cwd(),
    __dirname,
    fileStatus
  });
});

// Health endpoint for v0 routes
v0Router.get('/health', (req: Request, res: Response) => {
  console.log(`🏥 Health check: /v0/health from ${req.ip}`);
  setV0CorsHeaders(req, res);
  const dbStatus = true; // Database status check simplified
  
  // Check file system structure
  const fsInfo = {
    currentDir: process.cwd(),
    __dirname,
    distExists: fs.existsSync(path.join(process.cwd(), 'dist')),
    dataExists: fs.existsSync(path.join(process.cwd(), 'dist', 'data')),
    navExists: fs.existsSync(path.join(process.cwd(), 'dist', 'data', 'nav.json')),
    srcDataExists: fs.existsSync(path.join(process.cwd(), 'src', 'data')),
    srcNavExists: fs.existsSync(path.join(process.cwd(), 'src', 'data', 'nav.json'))
  };
  
  console.log('📁 File system info:', fsInfo);
  return res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus,
      status: dbStatus ? 'connected' : 'disconnected'
    },
    uptime: Math.floor(process.uptime()),
    endpoint: '/v0/health',
    filesystem: fsInfo
  });
});

// Main V0 data endpoint
v0Router.get('/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  
  // Log data access request
  console.log(`📊 Data request: /v0/${name} from ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
  
  // Set CORS headers
  setV0CorsHeaders(req, res);
  
  if (name in v0DataFiles) {
    try {
      const filename = v0DataFiles[name as keyof typeof v0DataFiles];
      
      // Try to load the data file using fs.readFileSync for better error handling
      let data;
      try {
        // Determine the correct path based on environment
        const isProduction = process.env.NODE_ENV === 'production';
        const isCompiled = __filename.endsWith('.js') && __dirname.includes('dist');
        
        console.log(`🔍 Environment: ${process.env.NODE_ENV}, Compiled: ${isCompiled}, Production: ${isProduction}`);
        console.log(`📁 Current directory: ${process.cwd()}`);
        console.log(`📁 __dirname: ${__dirname}`);
        
        // Prioritize production paths for deployed environment
        const possiblePaths = isProduction ? [
          // Production paths (compiled version)
          path.join(process.cwd(), 'dist', 'data', filename),
          path.join(__dirname, 'data', filename),
          path.join(__dirname, '..', 'data', filename),
          path.join(__dirname, '..', '..', 'data', filename),
          // Fallback paths
          path.join(process.cwd(), 'data', filename),
          path.join(process.cwd(), 'src', 'data', filename),
          path.join(__dirname, '../../data', filename),
          path.join(__dirname, 'data', filename),
          path.join(__dirname, '..', 'src', 'data', filename),
          path.join(__dirname, 'src', 'data', filename)
        ] : [
          // Development paths
          path.join(process.cwd(), 'src', 'data', filename),
          path.join(__dirname, 'data', filename),
          path.join(__dirname, '..', 'data', filename),
          path.join(__dirname, '..', 'src', 'data', filename),
          path.join(process.cwd(), 'data', filename),
          path.join(process.cwd(), 'dist', 'data', filename),
          path.join(__dirname, '../../data', filename),
          path.join(__dirname, 'src', 'data', filename),
          path.join(__dirname, '..', '..', 'data', filename),
          path.join(__dirname, '..', '..', 'dist', 'data', filename)
        ];

        let fileFound = false;
        let filePath = '';

        for (const tryPath of possiblePaths) {
          console.log(`🔍 Checking path: ${tryPath}`);
          if (fs.existsSync(tryPath)) {
            try {
              const fileContent = fs.readFileSync(tryPath, 'utf8');
              data = JSON.parse(fileContent);
              fileFound = true;
              filePath = tryPath;
              console.log(`✅ /v0/${name} Found file at: ${tryPath}`);
              break;
            } catch (readError) {
              console.error(`❌ /v0/${name} Error reading ${tryPath}:`, readError);
              continue;
            }
          } else {
            console.log(`❌ /v0/${name} File not found at: ${tryPath}`);
          }
        }

        if (!fileFound) {
          console.error(`❌ /v0/${name} Data file not found in any of the expected locations:`, possiblePaths);
          return res.status(404).json({ 
            success: false,
            message: 'Data file not found',
            error: `File ${filename} does not exist`,
            timestamp: new Date().toISOString(),
            debug: {
              environment: process.env.NODE_ENV,
              __dirname,
              processCwd: process.cwd(),
              filename,
              possiblePaths
            }
          });
        }
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.error(`❌ /v0/ File not found: ${filePath}`);
          return res.status(404).json({ 
            success: false,
            message: 'Data file not found',
            error: `File ${filename} does not exist`,
            timestamp: new Date().toISOString()
          });
        }
        
        // Read and parse the file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(fileContent);
        
      } catch (fileError) {
        console.error(`❌ /v0/ Error reading ${filename}:`, fileError);
        return res.status(500).json({ 
          success: false,
          message: 'Failed to load navigation data',
          error: 'Could not load navigation data',
          details: fileError instanceof Error ? fileError.message : 'Unknown file error',
          timestamp: new Date().toISOString()
        });
      }
      
      return res.json(data);
    } catch (err) {
      console.error(`❌ /v0/ Error processing ${name}:`, err);
      return res.status(500).json({ 
        error: 'Data processing error',
        message: `Could not process ${name} data`,
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