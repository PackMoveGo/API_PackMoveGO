const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware to log all requests
app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  console.log(`📱 ${req.method} ${req.path} from ${clientIP} - ${userAgent.substring(0, 50)}`);
  next();
});

// Test data
const testData = {
  blog: {
    posts: [
      {
        id: 1,
        title: "Test Blog Post",
        content: "This is a test blog post for mobile API debugging"
      }
    ]
  },
  services: {
    items: [
      {
        id: "house-mover",
        title: "Professional House Mover",
        price: "$1,200"
      }
    ]
  },
  about: {
    company: "PackMoveGo",
    description: "Professional moving services"
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Debug server is running!',
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mobile health check
app.get('/mobile/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mobile health check successful',
    mobile: true,
    ip: req.ip,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    timestamp: new Date().toISOString()
  });
});

// Mobile API root
app.get('/mobile/api', (req, res) => {
  res.json({
    message: 'PackMoveGo Mobile API Debug Server',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    ip: req.ip,
    endpoints: [
      '/api/health',
      '/mobile/health',
      '/mobile/api',
      '/mobile/debug',
      '/mobile/data/:type'
    ]
  });
});

// Mobile debug info
app.get('/mobile/debug', (req, res) => {
  res.json({
    debug: true,
    headers: req.headers,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Data endpoints
app.get('/mobile/data/:type', (req, res) => {
  const { type } = req.params;
  const data = testData[type.toLowerCase()];
  
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({
      error: 'Data not found',
      available: Object.keys(testData),
      requested: type
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PackMoveGo Debug Server',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/mobile/health',
      '/mobile/api',
      '/mobile/debug',
      '/mobile/data/:type'
    ],
    instructions: 'Use these endpoints to test your mobile app'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 === PACKMOVEGO DEBUG SERVER ===');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('📱 Test endpoints:');
  console.log(`   • http://localhost:${PORT}/api/health`);
  console.log(`   • http://localhost:${PORT}/mobile/health`);
  console.log(`   • http://localhost:${PORT}/mobile/api`);
  console.log('=====================================');
}); 