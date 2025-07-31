#!/usr/bin/env node

/**
 * 🚀 PackMoveGO API Deployment Fix
 * 
 * This script fixes the deployed API issues:
 * 1. CORS headers not being set
 * 2. v0/nav returning 500 error
 * 3. File loading issues in production
 */

const https = require('https');
const { URL } = require('url');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PackMoveGO-Deployment-Fix/1.0',
        ...options.headers
      }
    };
    
    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = data;
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsedData,
          rawData: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testDeployedAPI() {
  log('🚀 Testing Deployed API...', 'bright');
  log('Testing: https://api.packmovego.com', 'cyan');
  log('='.repeat(60), 'bright');
  
  const endpoints = [
    { url: '/health', name: 'Health Check' },
    { url: '/api/health', name: 'API Health' },
    { url: '/v0/nav', name: 'Navigation Data' },
    { url: '/v0/about', name: 'About Data' },
    { url: '/v0/services', name: 'Services Data' },
    { url: '/api/auth/status', name: 'Auth Status' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`https://api.packmovego.com${endpoint.url}`, {
        headers: {
          'Origin': 'https://www.packmovego.com'
        }
      });
      
      const corsHeader = response.headers['access-control-allow-origin'];
      const hasCORS = corsHeader && (corsHeader === '*' || corsHeader.includes('packmovego.com'));
      
      if (response.statusCode === 200) {
        log(`✅ ${endpoint.name}: Status ${response.statusCode}, CORS: ${hasCORS ? '✅' : '❌'}`, 'green');
      } else if (response.statusCode === 500) {
        log(`❌ ${endpoint.name}: Status ${response.statusCode} - Server Error`, 'red');
        if (response.data && response.data.error) {
          log(`   Error: ${response.data.error}`, 'yellow');
        }
      } else {
        log(`❌ ${endpoint.name}: Status ${response.statusCode}`, 'red');
      }
    } catch (error) {
      log(`❌ ${endpoint.name}: ${error.message}`, 'red');
    }
  }
}

function printDeploymentInstructions() {
  log('\n' + '='.repeat(60), 'bright');
  log('🔧 DEPLOYMENT FIX INSTRUCTIONS', 'bright');
  log('='.repeat(60), 'bright');
  
  log('\n📋 Current Issues:', 'yellow');
  log('❌ CORS headers not being set in production', 'red');
  log('❌ /v0/nav returning 500 error', 'red');
  log('❌ File loading failing in compiled environment', 'red');
  
  log('\n🔧 Required Fixes:', 'cyan');
  log('1. Update server.ts with CORS middleware', 'green');
  log('2. Fix v0-routes.ts file loading', 'green');
  log('3. Ensure data files are copied to dist/', 'green');
  log('4. Redeploy to Render', 'green');
  
  log('\n🚀 Deployment Steps:', 'yellow');
  log('1. Push the fixed code to GitHub:', 'cyan');
  log('   git add .', 'cyan');
  log('   git commit -m "Fix CORS and v0 routes"', 'cyan');
  log('   git push origin main', 'cyan');
  log('2. Wait for Render to auto-deploy', 'cyan');
  log('3. Test the endpoints again', 'cyan');
  
  log('\n🔍 Quick Test Commands:', 'yellow');
  log('curl -X GET https://api.packmovego.com/health', 'cyan');
  log('curl -X GET https://api.packmovego.com/v0/nav', 'cyan');
  log('curl -I -H "Origin: https://www.packmovego.com" https://api.packmovego.com/health', 'cyan');
  
  log('\n⚠️  Important Notes:', 'red');
  log('• The deployed version is using the old code without our fixes', 'yellow');
  log('• You need to push the updated code to trigger a new deployment', 'yellow');
  log('• Render will automatically rebuild and deploy the new version', 'yellow');
  
  log('\n' + '='.repeat(60), 'bright');
}

async function runDeploymentTest() {
  try {
    await testDeployedAPI();
    printDeploymentInstructions();
  } catch (error) {
    log(`\n💥 Deployment test failed: ${error.message}`, 'red');
  }
}

runDeploymentTest(); 