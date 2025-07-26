const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// Get all network interfaces
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        ips.push({
          name: name,
          address: interface.address,
          netmask: interface.netmask
        });
      }
    });
  });
  
  return ips;
}

// Test connectivity to mobile API server
function testMobileAPIConnectivity() {
  return new Promise((resolve) => {
    exec('curl -s http://localhost:4000/health', (error, stdout) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        try {
          const data = JSON.parse(stdout);
          resolve({ success: true, data });
        } catch (e) {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  console.log(`📱 Phone Test: ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
  
  if (req.url === '/') {
    // Serve the phone connection test page
    fs.readFile('phone-connection-test.html', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading test page');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/health') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Phone test server is running!',
      timestamp: new Date().toISOString(),
      ip: req.socket.remoteAddress,
      networkIPs: getNetworkIPs()
    }));
  } else if (req.url === '/network-info') {
    // Network information endpoint
    const mobileAPITest = await testMobileAPIConnectivity();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      networkIPs: getNetworkIPs(),
      mobileAPIConnectivity: mobileAPITest,
      hostname: os.hostname(),
      platform: os.platform(),
      uptime: os.uptime(),
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/test-mobile-api') {
    // Test mobile API connectivity
    const mobileAPITest = await testMobileAPIConnectivity();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      mobileAPITest,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const PORT = 5001;
const networkIPs = getNetworkIPs();

server.listen(PORT, '0.0.0.0', () => {
  console.log('📱 === ENHANCED PHONE TEST SERVER ===');
  console.log(`📡 Server running on port ${PORT}`);
  console.log('🌐 Network Interfaces:');
  networkIPs.forEach(ip => {
    console.log(`   • ${ip.name}: http://${ip.address}:${PORT}`);
  });
  console.log('📱 Test endpoints:');
  console.log(`   • http://${networkIPs[0]?.address || 'localhost'}:${PORT}/health`);
  console.log(`   • http://${networkIPs[0]?.address || 'localhost'}:${PORT}/network-info`);
  console.log(`   • http://${networkIPs[0]?.address || 'localhost'}:${PORT}/test-mobile-api`);
  console.log('📱 Open this URL on your phone to test connectivity');
  console.log('=====================================');
}); 