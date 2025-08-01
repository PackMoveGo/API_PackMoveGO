#!/usr/bin/env node

const https = require('https');

const BASE_URL = 'https://api.packmovego.com';

// Test data endpoints
const testEndpoints = [
  '/v0/test',
  '/v0/health',
  '/v0/nav',
  '/v0/blog',
  '/v0/about',
  '/v0/contact',
  '/v0/services',
  '/v0/reviews',
  '/v0/locations',
  '/v0/supplies',
  '/v0/testimonials'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${endpoint}`;
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Data-Loading-Test/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ ${endpoint} - Status: ${res.statusCode}`);
          
          // Check for specific data structure
          if (endpoint === '/v0/health' && jsonData.filesystem) {
            console.log(`📁 File system info for ${endpoint}:`, jsonData.filesystem);
          }
          
          if (endpoint === '/v0/test' && jsonData.fileStatus) {
            console.log(`📁 File status for ${endpoint}:`, jsonData.fileStatus);
          }
          
          resolve({
            endpoint,
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (parseError) {
          console.log(`❌ ${endpoint} - Parse error: ${parseError.message}`);
          resolve({
            endpoint,
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${endpoint} - Error: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      console.log(`⏰ ${endpoint} - Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function runTests() {
  console.log('🧪 Testing data loading on deployed API...');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('📊 Testing data file accessibility...\n');
  
  for (const endpoint of testEndpoints) {
    try {
      await testEndpoint(endpoint);
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`❌ Failed to test ${endpoint}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Data loading test completed!');
  console.log('📋 Check the logs above for file system information.');
  console.log('🔍 Look for file system info in the /v0/health and /v0/test responses.');
}

runTests().catch(console.error); 