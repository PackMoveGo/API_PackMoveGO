const https = require('https');
const http = require('http');

const BASE_URL = 'https://api.packmovego.com';
const TEST_ENDPOINTS = [
  '/health',
  '/api/health',
  '/v0/nav',
  '/api/v0/nav',
  '/v0/services',
  '/api/v0/services',
  '/v0/testimonials',
  '/api/v0/testimonials'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = `${BASE_URL}${endpoint}`;
    
    const req = https.get(url, (res) => {
      const responseTime = Date.now() - startTime;
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${endpoint} - ${res.statusCode} (${responseTime}ms)`);
        } else {
          console.log(`❌ ${endpoint} - ${res.statusCode} (${responseTime}ms)`);
          console.log(`   Response: ${data.substring(0, 200)}...`);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      console.log(`❌ ${endpoint} - Error: ${err.message} (${responseTime}ms)`);
      resolve();
    });
    
    req.setTimeout(10000, () => {
      const responseTime = Date.now() - startTime;
      console.log(`⏰ ${endpoint} - Timeout (${responseTime}ms)`);
      req.destroy();
      resolve();
    });
  });
}

async function runProductionTest() {
  console.log(`🚀 Testing production server: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  for (const endpoint of TEST_ENDPOINTS) {
    await testEndpoint(endpoint);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Production test completed');
}

// Run the test
runProductionTest().catch(console.error); 