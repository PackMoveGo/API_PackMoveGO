#!/usr/bin/env node

const https = require('https');

async function testMobileAccess() {
  console.log('📱 Testing mobile access to /v0/ routes...\n');
  
  const testRoutes = [
    '/v0/services',
    '/v0/testimonials', 
    '/v0/nav'
  ];
  
  // Test with mobile-like headers (no origin, minimal headers)
  const mobileHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  };
  
  for (const route of testRoutes) {
    console.log(`📡 Testing: ${route}`);
    
    try {
      const response = await makeRequest(route, mobileHeaders);
      
      console.log(`✅ Status: ${response.statusCode}`);
      console.log(`📋 Response Headers:`);
      console.log(`   Content-Type: ${response.headers['content-type'] || 'NOT SET'}`);
      console.log(`   CORS Origin: ${response.headers['access-control-allow-origin'] || 'NOT SET'}`);
      console.log(`   CORS Credentials: ${response.headers['access-control-allow-credentials'] || 'NOT SET'}`);
      console.log(`   CORS Methods: ${response.headers['access-control-allow-methods'] || 'NOT SET'}`);
      console.log(`   CORS Headers: ${response.headers['access-control-allow-headers'] || 'NOT SET'}`);
      
      if (response.statusCode === 200) {
        console.log(`✅ SUCCESS: Route accessible from mobile`);
      } else if (response.statusCode === 403) {
        console.log(`❌ BLOCKED: Route blocked by authentication`);
      } else {
        console.log(`⚠️ UNEXPECTED: Status ${response.statusCode}`);
      }
      console.log('');
      
    } catch (error) {
      console.log(`❌ Error testing ${route}:`, error.message);
      console.log('');
    }
  }
}

function makeRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.packmovego.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: headers
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Run the test
testMobileAccess().catch(console.error); 