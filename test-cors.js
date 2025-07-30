#!/usr/bin/env node

/**
 * CORS Test Script
 * Tests CORS configuration for different origins and endpoints
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testCORS(origin, endpoint, description) {
  try {
    console.log(`\n🧪 Testing CORS: ${description}`);
    console.log(`📍 Origin: ${origin}`);
    console.log(`📍 Endpoint: ${BASE_URL}${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`🔒 CORS Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
    console.log(`   Access-Control-Allow-Credentials: ${response.headers.get('access-control-allow-credentials')}`);
    console.log(`   Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
    
    return response.status === 200;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function testCORSConfiguration() {
  console.log('🔄 CORS Configuration Test');
  console.log('==========================');
  
  const testCases = [
    {
      origin: 'http://localhost:5173',
      endpoint: '/v0/nav',
      description: 'Vite Dev Server (5173)'
    },
    {
      origin: 'http://localhost:5000',
      endpoint: '/v0/nav',
      description: 'Port 5000'
    },
    {
      origin: 'http://localhost:5001',
      endpoint: '/v0/nav',
      description: 'Port 5001'
    },
    {
      origin: 'http://127.0.0.1:5173',
      endpoint: '/v0/nav',
      description: '127.0.0.1:5173'
    },
    {
      origin: 'http://127.0.0.1:5000',
      endpoint: '/v0/nav',
      description: '127.0.0.1:5000'
    },
    {
      origin: 'http://127.0.0.1:5001',
      endpoint: '/v0/nav',
      description: '127.0.0.1:5001'
    },
    {
      origin: null,
      endpoint: '/v0/nav',
      description: 'No Origin (like curl)'
    }
  ];
  
  let successCount = 0;
  
  for (const testCase of testCases) {
    const success = await testCORS(testCase.origin, testCase.endpoint, testCase.description);
    if (success) successCount++;
  }
  
  console.log(`\n📊 CORS Test Results: ${successCount}/${testCases.length} successful`);
  
  if (successCount === testCases.length) {
    console.log('✅ CORS is properly configured for all test cases!');
  } else {
    console.log('❌ Some CORS tests failed - check the configuration');
  }
  
  // Test OPTIONS preflight request
  console.log('\n🔍 Testing OPTIONS preflight request...');
  try {
    const response = await fetch(`${BASE_URL}/v0/nav`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`✅ OPTIONS Status: ${response.status}`);
    console.log(`🔒 Preflight Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
    console.log(`   Access-Control-Allow-Headers: ${response.headers.get('access-control-allow-headers')}`);
  } catch (error) {
    console.log(`❌ OPTIONS Error: ${error.message}`);
  }
}

testCORSConfiguration().catch(console.error); 