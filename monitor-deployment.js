#!/usr/bin/env node

const https = require('https');

const API_KEY = 'pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6';
let attempt = 1;

console.log('🚀 PackMoveGO Backend Deployment Monitor\n');
console.log('Monitoring deployment status every 30 seconds...');
console.log('Press Ctrl+C to stop\n');

function testEndpoint(endpoint, useApiKey = false) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.packmovego.com',
      port: 443,
      path: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'PackMoveGo-Monitor'
      }
    };

    if (useApiKey) {
      options.headers['x-api-key'] = API_KEY;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 'ERROR', error: err.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ status: 'TIMEOUT' });
    });

    req.end();
  });
}

async function checkDeployment() {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] Attempt #${attempt}:`);
  
  // Test API key authentication
  const result = await testEndpoint('/v0/services', true);
  
  if (result.status === 200) {
    console.log('🎉 SUCCESS! API key authentication is working!');
    console.log('✅ Backend deployment is complete and functional!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your frontend to use the API key');
    console.log('2. Test from your frontend application');
    console.log('3. Your IP is also whitelisted for direct access');
    process.exit(0);
  } else if (result.status === 302) {
    console.log(`❌ Still redirecting (302) - Environment variables not deployed yet`);
  } else if (result.status === 403) {
    console.log(`🔒 Got 403 - Authentication is working but key might be invalid`);
    try {
      const parsed = JSON.parse(result.data);
      console.log(`   Message: ${parsed.message}`);
    } catch (e) {}
  } else {
    console.log(`❓ Status: ${result.status}`);
    if (result.data) {
      try {
        const parsed = JSON.parse(result.data);
        if (parsed.message) console.log(`   Message: ${parsed.message}`);
      } catch (e) {
        console.log(`   Response: ${result.data.substring(0, 100)}...`);
      }
    }
  }
  
  attempt++;
  
  // Check if this is taking too long
  if (attempt > 20) { // 10 minutes
    console.log('\n⚠️  Deployment is taking longer than expected.');
    console.log('📝 Please verify:');
    console.log('   1. Environment variables were added to Render');
    console.log('   2. Render deployment completed successfully');
    console.log('   3. No build errors in Render logs');
  }
  
  console.log('   Waiting 30 seconds...\n');
}

// Run immediately, then every 30 seconds
checkDeployment();
setInterval(checkDeployment, 30000); 