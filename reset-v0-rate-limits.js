#!/usr/bin/env node

/**
 * Reset Rate Limits for v0 Endpoints
 * This script clears all rate limit stores and tests v0 endpoint access
 */

const rateLimit = require('express-rate-limit');

console.log('🔄 Resetting rate limits for v0 endpoints...');

// Clear global rate limit stores if they exist
if (global.rateLimitStore) {
  global.rateLimitStore.clear();
  console.log('✅ Cleared global rateLimitStore');
}

if (global.frontendRateLimit) {
  global.frontendRateLimit.clear();
  console.log('✅ Cleared global frontendRateLimit');
}

if (global.apiRateLimitStore) {
  global.apiRateLimitStore.clear();
  console.log('✅ Cleared global apiRateLimitStore');
}

// Clear any express-rate-limit stores
const stores = [
  'rateLimitStore',
  'frontendRateLimit',
  'apiRateLimitStore',
  'advancedRateLimitStore',
  'burstProtectionStore'
];

stores.forEach(storeName => {
  if (global[storeName]) {
    global[storeName].clear();
    console.log(`✅ Cleared ${storeName}`);
  }
});

console.log('\n🧪 Testing v0 endpoint access...');

// Test the v0/nav endpoint
const http = require('http');

const testOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/v0/nav',
  method: 'GET',
  headers: {
    'User-Agent': 'Rate-Limit-Test-Script'
  }
};

const req = http.request(testOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`\n📊 Test Results:`);
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    console.log(`Response:`, data.substring(0, 200) + (data.length > 200 ? '...' : ''));
    
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: v0/nav endpoint is accessible!');
    } else if (res.statusCode === 429) {
      console.log('❌ FAILED: Still getting rate limited');
    } else {
      console.log(`⚠️ UNEXPECTED: Got status ${res.statusCode}`);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Test failed:', err.message);
});

req.end();

console.log('🔄 Rate limit reset complete. Check the test results above.');
