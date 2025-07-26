const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
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
      ip: req.socket.remoteAddress
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const PORT = 5001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('📱 === PHONE TEST SERVER ===');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Accessible at: http://100.69.38.2:${PORT}`);
  console.log(`🌐 Also try: http://10.1.12.50:${PORT}`);
  console.log('📱 Open this URL on your phone to test connectivity');
  console.log('=====================================');
}); 