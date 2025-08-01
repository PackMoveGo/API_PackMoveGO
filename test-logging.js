#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = 'https://api.packmovego.com';

// Test endpoints to verify logging
const testEndpoints = [
  '/test-logging',
  '/health',
  '/v0/nav',
  '/v0/blog',
  '/v0/about',
  '/v0/contact'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${endpoint}`;
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Logging-Test-Script/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ ${endpoint} - Status: ${res.statusCode}`);
        resolve({
          endpoint,
          statusCode: res.statusCode,
          data: data
        });
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
  console.log('🧪 Testing API logging on Render...');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('📊 Making requests to trigger logging...\n');
  
  for (const endpoint of testEndpoints) {
    try {
      await testEndpoint(endpoint);
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`❌ Failed to test ${endpoint}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Test completed!');
  console.log('📋 Check your Render console logs to see the request logging.');
  console.log('🔍 Look for lines starting with timestamps like: [2025-07-31T23:05:54.182Z]');
}

runTests().catch(console.error); 