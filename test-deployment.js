#!/usr/bin/env node

const https = require('https');

const API_BASE = 'https://api.packmovego.com';
const API_KEY = 'pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6';

console.log('🚀 Testing PackMoveGO API Deployment...\n');

// Test function
function testEndpoint(endpoint, useApiKey = false) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.packmovego.com',
      port: 443,
      path: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'PackMoveGo-Test'
      }
    };

    if (useApiKey) {
      options.headers['x-api-key'] = API_KEY;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const status = res.statusCode;
        const isSuccess = status === 200;
        const icon = isSuccess ? '✅' : '❌';
        console.log(`${icon} ${endpoint} ${useApiKey ? '(with API key)' : '(no auth)'}: ${status}`);
        
        if (!isSuccess && data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.message) {
              console.log(`   Message: ${parsed.message}`);
            }
          } catch (e) {
            // Not JSON, show raw response
            console.log(`   Response: ${data.substring(0, 100)}...`);
          }
        }
        resolve(isSuccess);
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${endpoint}: Error - ${err.message}`);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.log(`⏰ ${endpoint}: Timeout`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing health endpoint (should always work):');
  await testEndpoint('/api/health');
  
  console.log('\nTesting protected endpoint without API key (should be blocked):');
  await testEndpoint('/v0/services');
  
  console.log('\nTesting protected endpoint with API key (should work after deployment):');
  const success = await testEndpoint('/v0/services', true);
  
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 DEPLOYMENT SUCCESSFUL! API key authentication is working!');
    console.log('✅ Your frontend can now use the API key to access the backend.');
  } else {
    console.log('⏳ Deployment not ready yet. Try again in a few minutes.');
    console.log('📝 Make sure you added the environment variables to Render.');
  }
  console.log('='.repeat(50));
}

runTests(); 