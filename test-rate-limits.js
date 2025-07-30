#!/usr/bin/env node

/**
 * Rate Limit Test Script
 * Tests the rate limiting configuration to ensure /v0/ endpoints are not rate limited
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📍 Endpoint: ${BASE_URL}${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
    
    return response.status === 200;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function testRateLimits() {
  console.log('🔄 Rate Limit Test Script');
  console.log('========================');
  
  // Test health endpoint (should work)
  await testEndpoint('/health', 'Health Check');
  
  // Test v0 endpoints (should not be rate limited)
  await testEndpoint('/v0/nav', 'Navigation Data');
  await testEndpoint('/v0/services', 'Services Data');
  await testEndpoint('/v0/testimonials', 'Testimonials Data');
  await testEndpoint('/v0/about', 'About Data');
  
  // Test multiple rapid requests to v0 endpoints
  console.log('\n🚀 Testing rapid requests to v0 endpoints...');
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(testEndpoint('/v0/nav', `Rapid Request ${i + 1}`));
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r).length;
  
  console.log(`\n📊 Rapid Request Results: ${successCount}/10 successful`);
  
  if (successCount === 10) {
    console.log('✅ Rate limiting is properly configured for v0 endpoints!');
  } else {
    console.log('❌ Some requests failed - rate limiting may still be active');
  }
  
  // Test a protected endpoint that should be rate limited
  console.log('\n🔒 Testing protected endpoint (should be rate limited)...');
  await testEndpoint('/api/auth/status', 'Protected Endpoint');
}

testRateLimits().catch(console.error); 