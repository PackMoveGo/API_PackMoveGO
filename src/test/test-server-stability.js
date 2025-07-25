const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_ENDPOINTS = [
  '/api/health',
  '/health',
  '/',
  '/api/v0/nav',
  '/api/v0/services',
  '/api/v0/testimonials'
];

let successCount = 0;
let errorCount = 0;
let totalResponseTime = 0;

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = `${BASE_URL}${endpoint}`;
    
    const req = http.get(url, (res) => {
      const responseTime = Date.now() - startTime;
      totalResponseTime += responseTime;
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          successCount++;
          console.log(`✅ ${endpoint} - ${res.statusCode} (${responseTime}ms)`);
        } else {
          errorCount++;
          console.log(`❌ ${endpoint} - ${res.statusCode} (${responseTime}ms)`);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      errorCount++;
      const responseTime = Date.now() - startTime;
      console.log(`❌ ${endpoint} - Error: ${err.message} (${responseTime}ms)`);
      resolve();
    });
    
    req.setTimeout(10000, () => {
      errorCount++;
      const responseTime = Date.now() - startTime;
      console.log(`⏰ ${endpoint} - Timeout (${responseTime}ms)`);
      req.destroy();
      resolve();
    });
  });
}

async function runStabilityTest() {
  console.log(`🚀 Starting stability test for ${BASE_URL}`);
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  const testRounds = 10;
  
  for (let round = 1; round <= testRounds; round++) {
    console.log(`\n📊 Round ${round}/${testRounds}`);
    
    for (const endpoint of TEST_ENDPOINTS) {
      await testEndpoint(endpoint);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const totalTime = Date.now() - startTime;
  const totalRequests = TEST_ENDPOINTS.length * testRounds;
  const avgResponseTime = totalResponseTime / totalRequests;
  const successRate = (successCount / totalRequests) * 100;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`Total Test Time: ${(totalTime / 1000).toFixed(2)}s`);
  
  if (successRate >= 95) {
    console.log('✅ Server stability: EXCELLENT');
  } else if (successRate >= 80) {
    console.log('⚠️ Server stability: GOOD');
  } else if (successRate >= 60) {
    console.log('⚠️ Server stability: FAIR');
  } else {
    console.log('❌ Server stability: POOR');
  }
}

// Run the test
runStabilityTest().catch(console.error); 