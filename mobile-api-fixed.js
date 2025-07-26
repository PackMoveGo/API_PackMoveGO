const http = require('http');

// Simple data for testing
const testData = {
  blog: {
    posts: [
      {
        id: 1,
        title: "Test Blog Post",
        content: "This is a test blog post for mobile API"
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
  }
};

const server = http.createServer((req, res) => {
  // ALWAYS set CORS headers for mobile
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const clientIP = req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`📱 ${req.method} ${req.url} from ${clientIP} - ${userAgent.substring(0, 50)}`);
  
  // Route handling
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Mobile API Server is running!',
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent: userAgent.substring(0, 100)
    }));
  } 
  else if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Mobile test successful',
      mobile: true,
      ip: clientIP,
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString()
    }));
  }
  else if (req.url === '/v0/blog') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(testData.blog));
  }
  else if (req.url === '/v0/services') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(testData.services));
  }
  else if (req.url === '/mobile-test') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Mobile API working perfectly!',
      mobile: true,
      ip: clientIP,
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString(),
      endpoints: ['/health', '/test', '/v0/blog', '/v0/services', '/mobile-test']
    }));
  }
  else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'PackMoveGO Mobile API Server',
      version: '1.0.0',
      status: 'active',
      timestamp: new Date().toISOString(),
      ip: clientIP,
      endpoints: ['/health', '/test', '/v0/blog', '/v0/services', '/mobile-test'],
      instructions: 'Try /health, /test, or /mobile-test on your phone!'
    }));
  }
});

// Error handling
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

const PORT = 8080; // Use a different port
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 === MOBILE API SERVER (FIXED) ===');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Accessible at: http://100.69.38.2:${PORT}`);
  console.log(`🌐 Also try: http://10.1.12.50:${PORT}`);
  console.log('📱 Test endpoints:');
  console.log(`   • http://100.69.38.2:${PORT}/health`);
  console.log(`   • http://100.69.38.2:${PORT}/test`);
  console.log(`   • http://100.69.38.2:${PORT}/mobile-test`);
  console.log(`   • http://100.69.38.2:${PORT}/v0/blog`);
  console.log('=====================================');
}); 