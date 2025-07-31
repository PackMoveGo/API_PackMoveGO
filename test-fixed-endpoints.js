#!/usr/bin/env node

/**
 * 🧪 Quick API Test Script
 * Tests the fixed endpoints
 */

const https = require('https');
const { URL } = require('url');

function testEndpoint(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Origin': 'https://www.packmovego.com'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const corsHeader = res.headers['access-control-allow-origin'];
        const status = res.statusCode === expectedStatus ? '✅' : '❌';
        console.log(`${status} ${url} - Status: ${res.statusCode}, CORS: ${corsHeader || 'missing'}`);
        resolve();
      });
    });
    req.on('error', () => {
      console.log(`❌ ${url} - Connection failed`);
      resolve();
    });
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Fixed Endpoints...\n');
  
  const endpoints = [
    'https://api.packmovego.com/health',
    'https://api.packmovego.com/api/health',
    'https://api.packmovego.com/api/heartbeat',
    'https://api.packmovego.com/api/ping',
    'https://api.packmovego.com/v0/nav',
    'https://api.packmovego.com/v0/about',
    'https://api.packmovego.com/v0/services',
    'https://api.packmovego.com/api/auth/status'
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n✅ Testing complete!');
}

runTests();