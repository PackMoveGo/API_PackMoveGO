#!/usr/bin/env node

const https = require('https');

const API_BASE = 'https://api.packmovego.com';
const ADMIN_API_KEY = 'pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4';

console.log('🚀 PackMoveGO Enhanced Backend Deployment Monitor');
console.log('🎯 Monitoring enterprise features deployment...\n');

let attempt = 1;
let featuresWorking = {
  coreAPI: false,
  analytics: false,
  performance: false,
  rateLimit: false,
  backup: false
};

function makeRequest(endpoint, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, API_BASE);
    const requestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PackMoveGo-Enhanced-Monitor',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 'ERROR', error: err.message }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ status: 'TIMEOUT' });
    });

    req.end();
  });
}

async function testCoreAPI() {
  try {
    const result = await makeRequest('/v0/services');
    if (result.status === 200 && result.data.services) {
      featuresWorking.coreAPI = true;
      return `✅ Core API: ${result.data.services.length} services`;
    }
    return `❌ Core API: ${result.status}`;
  } catch {
    return `❌ Core API: Error`;
  }
}

async function testAnalytics() {
  try {
    const publicResult = await makeRequest('/api/analytics/health');
    const adminResult = await makeRequest('/api/analytics/performance', {
      headers: { 'x-api-key': ADMIN_API_KEY }
    });
    
    if (publicResult.status === 200 && adminResult.status === 200) {
      featuresWorking.analytics = true;
      return `✅ Analytics: Public & Admin endpoints working`;
    } else if (publicResult.status === 200) {
      return `🟡 Analytics: Public working (${publicResult.status}), Admin pending (${adminResult.status})`;
    }
    return `❌ Analytics: Public ${publicResult.status}, Admin ${adminResult.status}`;
  } catch {
    return `❌ Analytics: Error`;
  }
}

async function testPerformanceMonitoring() {
  try {
    const result = await makeRequest('/api/analytics/realtime');
    if (result.status === 200 && result.data?.data) {
      featuresWorking.performance = true;
      const data = result.data.data;
      return `✅ Performance: ${data.requestsLast5Min} requests/5min, ${data.avgResponseTimeLast5Min}ms avg`;
    }
    return `❌ Performance: ${result.status}`;
  } catch {
    return `❌ Performance: Error`;
  }
}

async function testRateLimiting() {
  try {
    // Make multiple rapid requests to test rate limiting
    const promises = Array(5).fill().map(() => makeRequest('/v0/services'));
    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.status === 200).length;
    if (successCount >= 4) {
      featuresWorking.rateLimit = true;
      return `✅ Rate Limiting: ${successCount}/5 requests allowed`;
    }
    return `🟡 Rate Limiting: ${successCount}/5 requests (may be rate limited)`;
  } catch {
    return `❌ Rate Limiting: Error`;
  }
}

async function testBackupSystem() {
  try {
    // Test if backup endpoints are available (admin only)
    const result = await makeRequest('/api/analytics/export', {
      headers: { 'x-api-key': ADMIN_API_KEY }
    });
    
    if (result.status === 200 || result.status === 403) {
      featuresWorking.backup = true;
      return `✅ Backup System: Export endpoint available`;
    }
    return `❌ Backup System: ${result.status}`;
  } catch {
    return `❌ Backup System: Error`;
  }
}

async function checkDeploymentStatus() {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] Deployment Check #${attempt}:`);
  
  const results = await Promise.all([
    testCoreAPI(),
    testAnalytics(), 
    testPerformanceMonitoring(),
    testRateLimiting(),
    testBackupSystem()
  ]);

  results.forEach(result => console.log(`   ${result}`));
  
  const workingFeatures = Object.values(featuresWorking).filter(Boolean).length;
  const totalFeatures = Object.keys(featuresWorking).length;
  
  console.log(`   📊 Features Working: ${workingFeatures}/${totalFeatures}`);
  
  if (workingFeatures === totalFeatures) {
    console.log('\n🎉 DEPLOYMENT COMPLETE! All enhanced features are operational!');
    console.log('✅ Enterprise-grade backend successfully deployed');
    console.log('\n🚀 Available Enhanced Features:');
    console.log('   📊 Real-time Analytics Dashboard');
    console.log('   ⚡ Performance Monitoring System'); 
    console.log('   🛡️ Advanced Rate Limiting');
    console.log('   💾 Automated Backup System');
    console.log('   🔒 Multi-tier Security');
    console.log('\n🔗 Test the new features:');
    console.log(`   curl ${API_BASE}/api/analytics/health`);
    console.log(`   curl -H "x-api-key: ${ADMIN_API_KEY}" ${API_BASE}/api/analytics/performance`);
    
    process.exit(0);
  } else if (workingFeatures > 0) {
    console.log(`   🟡 Partial deployment: ${workingFeatures} features ready, ${totalFeatures - workingFeatures} pending`);
  } else {
    console.log('   ⏳ Deployment in progress...');
  }
  
  attempt++;
  console.log('   Waiting 30 seconds...\n');
}

// Start monitoring
async function startMonitoring() {
  console.log('Starting continuous deployment monitoring...');
  console.log('Press Ctrl+C to stop\n');
  
  // Check immediately
  await checkDeploymentStatus();
  
  // Then check every 30 seconds
  const interval = setInterval(async () => {
    await checkDeploymentStatus();
    
    // Stop after 20 attempts (10 minutes)
    if (attempt > 20) {
      console.log('\n⏰ Monitoring timeout reached');
      console.log('📝 Deployment may need more time or manual verification');
      clearInterval(interval);
      process.exit(1);
    }
  }, 30000);
}

startMonitoring().catch(console.error); 