#!/usr/bin/env node

/**
 * 🧪 Quick Test for Nav.json Fix
 * Tests the /v0/nav endpoint after the fix
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

function testNavEndpoint() {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.packmovego.com',
      port: 443,
      path: '/v0/nav',
      method: 'GET',
      headers: {
        'Origin': 'https://www.packmovego.com'
      }
    }, (res) => {
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
        
        const corsHeader = res.headers['access-control-allow-origin'];
        const hasCORS = corsHeader && (corsHeader === '*' || corsHeader.includes('packmovego.com'));
        
        if (res.statusCode === 200) {
          log(`✅ /v0/nav: Status ${res.statusCode}, CORS: ${hasCORS ? '✅' : '❌'}`, 'green');
          if (parsedData && typeof parsedData === 'object') {
            log(`   Data loaded successfully with ${Object.keys(parsedData).length} properties`, 'green');
          }
        } else {
          log(`❌ /v0/nav: Status ${res.statusCode}`, 'red');
          if (parsedData && parsedData.error) {
            log(`   Error: ${parsedData.error}`, 'yellow');
          }
        }
        
        resolve({
          statusCode: res.statusCode,
          hasCORS,
          data: parsedData
        });
      });
    });
    
    req.on('error', (error) => {
      log(`❌ /v0/nav: ${error.message}`, 'red');
      resolve({ statusCode: 0, hasCORS: false, data: null });
    });
    
    req.end();
  });
}

async function runTest() {
  log('🧪 Testing Nav.json Fix...', 'bright');
  log('Testing: https://api.packmovego.com/v0/nav', 'cyan');
  log('='.repeat(60), 'bright');
  
  const result = await testNavEndpoint();
  
  log('\n' + '='.repeat(60), 'bright');
  log('📊 TEST RESULTS', 'bright');
  log('='.repeat(60), 'bright');
  
  if (result.statusCode === 200) {
    log('🎉 Nav.json fix appears to be working!', 'green');
    log('Your frontend should now be able to load navigation data.', 'green');
  } else {
    log('⚠️  Nav.json fix may still be deploying...', 'yellow');
    log('Wait 2-3 minutes and run this test again.', 'yellow');
  }
  
  log('\n🔍 Next Steps:', 'cyan');
  log('1. Wait 2-3 minutes for deployment to complete', 'cyan');
  log('2. Run this test again: node test-nav-fix.js', 'cyan');
  log('3. Test your frontend at https://www.packmovego.com', 'cyan');
  
  log('\n' + '='.repeat(60), 'bright');
}

runTest(); 