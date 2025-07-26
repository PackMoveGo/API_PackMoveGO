const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// Enable CORS for ALL requests - no restrictions
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With']
}));

// Simple middleware to log all requests
app.use((req, res, next) => {
  console.log(`📱 ${req.method} ${req.path} from ${req.ip} - ${req.get('User-Agent')?.substring(0, 50) || 'Unknown'}`);
  next();
});

// Health check - ALWAYS works
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100)
  });
});

// Mobile health check - ALWAYS works
app.get('/mobile/health', (req, res) => {
  res.json({
    status: 'ok',
    mobile: true,
    message: 'Mobile API is working!',
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100)
  });
});

// Mobile API endpoint - ALWAYS works
app.get('/mobile/api', (req, res) => {
  res.json({
    success: true,
    message: 'Mobile API endpoint is working!',
    mobile: true,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100)
  });
});

// Mobile debug endpoint - ALWAYS works
app.get('/mobile/debug', (req, res) => {
  res.json({
    success: true,
    debug: {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
      server: 'Simple PackMoveGo API',
      environment: 'development'
    }
  });
});

// Mobile data endpoint - serves your actual data
app.get('/mobile/data/:type', (req, res) => {
  const dataType = req.params.type;
  
  try {
    const dataPath = path.join(__dirname, `src/data/${dataType}.json`);
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      res.json({
        success: true,
        data: data,
        type: dataType,
        mobile: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Data type '${dataType}' not found`,
        availableTypes: ['about', 'blog', 'contact', 'locations', 'nav', 'referral', 'reviews', 'Services', 'supplies', 'Testimonials'],
        mobile: true,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading data',
      error: error.message,
      mobile: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve the mobile test page
app.get('/mobile-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'mobile-test.html'));
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PackMoveGo API is running!',
    endpoints: {
      health: '/health',
      mobileHealth: '/mobile/health',
      mobileAPI: '/mobile/api',
      mobileDebug: '/mobile/debug',
      mobileData: '/mobile/data/:type',
      testPage: '/mobile-test.html'
    },
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 === SIMPLE MOBILE API SERVER ===');
  console.log(`📡 Server running on: http://0.0.0.0:${PORT}`);
  console.log(`📱 Mobile test page: http://0.0.0.0:${PORT}/mobile-test.html`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📱 Mobile health: http://0.0.0.0:${PORT}/mobile/health`);
  console.log('=====================================');
  
  // Get local IP addresses
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  console.log('\n🌐 Available IP addresses for phone testing:');
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   📱 http://${net.address}:${PORT}/mobile-test.html`);
      }
    }
  }
  console.log('\n📱 Open any of these URLs on your phone to test!');
}); 