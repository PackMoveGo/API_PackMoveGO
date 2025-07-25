#!/usr/bin/env node

/**
 * Test API Authentication
 * This script tests all authentication methods for the PackMoveGO API
 */

const https = require('https');

const API_BASE = 'https://api.packmovego.com';
const API_KEYS = {
  frontend: 'pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6',
  admin: 'pmg_admin_live_sk_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4'
};

function makeRequest(endpoint, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testAPI() {
  console.log('🔬 TESTING API AUTHENTICATION');
  console.log('=' .repeat(50));

  const tests = [
    {
      name: 'Health Check (No Auth)',
      endpoint: '/api/health',
      headers: {}
    },
    {
      name: 'Health Check with Frontend API Key (x-api-key)',
      endpoint: '/api/health',
      headers: { 'x-api-key': API_KEYS.frontend }
    },
    {
      name: 'Health Check with Frontend API Key (Authorization)',
      endpoint: '/api/health',
      headers: { 'Authorization': `Bearer ${API_KEYS.frontend}` }
    },
    {
      name: 'Health Check with Admin API Key',
      endpoint: '/api/health',
      headers: { 'x-api-key': API_KEYS.admin }
    },
    {
      name: 'Protected Endpoint (No Auth) - Should Fail',
      endpoint: '/api/services',
      headers: {}
    },
    {
      name: 'Protected Endpoint with Frontend API Key',
      endpoint: '/api/services',
      headers: { 'x-api-key': API_KEYS.frontend }
    },
    {
      name: 'Protected Endpoint with Admin API Key',
      endpoint: '/api/services',
      headers: { 'x-api-key': API_KEYS.admin }
    }
  ];

  for (const test of tests) {
    console.log(`\n🧪 ${test.name}`);
    console.log('-'.repeat(40));
    
    try {
      const result = await makeRequest(test.endpoint, test.headers);
      
      console.log(`Status: ${result.status}`);
      
      let body;
      try {
        body = JSON.parse(result.body);
        console.log('Response:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('Response (raw):', result.body.substring(0, 200));
      }
      
      if (result.status === 200) {
        console.log('✅ SUCCESS');
      } else if (result.status === 403 && test.name.includes('Should Fail')) {
        console.log('✅ EXPECTED FAILURE');
      } else {
        console.log('❌ UNEXPECTED RESULT');
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
  }

  console.log('\n🎯 SUMMARY');
  console.log('=' .repeat(50));
  console.log('If authentication is working correctly, you should see:');
  console.log('- Health checks succeed with and without API keys');
  console.log('- Protected endpoints fail without API keys (403)');
  console.log('- Protected endpoints succeed with valid API keys (200)');
  console.log('\nIf you see "Access denied" errors, the environment variables');
  console.log('may not have been deployed yet. Wait a few minutes and try again.');
}

// Run the tests
testAPI().catch(console.error); 