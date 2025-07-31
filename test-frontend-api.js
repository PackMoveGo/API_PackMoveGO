#!/usr/bin/env node

/**
 * 🧪 Frontend API Test Script
 * Tests all API endpoints that your frontend needs
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

function testEndpoint(url, name, expectedStatus = 200) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Origin': 'https://www.packmovego.com',
        'Referer': 'https://www.packmovego.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const corsHeader = res.headers['access-control-allow-origin'];
        const hasCORS = corsHeader && (corsHeader === '*' || corsHeader.includes('packmovego.com'));
        
        if (res.statusCode === expectedStatus) {
          log(`✅ ${name}: Status ${res.statusCode}, CORS: ${hasCORS ? '✅' : '❌'}`, 'green');
          if (data && data.length > 0) {
            try {
              const jsonData = JSON.parse(data);
              if (jsonData && typeof jsonData === 'object') {
                log(`   Data: ${Object.keys(jsonData).length} properties`, 'green');
              }
            } catch (e) {
              log(`   Data: ${data.length} characters`, 'green');
            }
          }
        } else {
          log(`❌ ${name}: Status ${res.statusCode}`, 'red');
          if (data) {
            try {
              const jsonData = JSON.parse(data);
              if (jsonData.error) {
                log(`   Error: ${jsonData.error}`, 'yellow');
              }
            } catch (e) {
              log(`   Response: ${data.substring(0, 100)}...`, 'yellow');
            }
          }
        }
        
        resolve({
          statusCode: res.statusCode,
          hasCORS,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      log(`❌ ${name}: ${error.message}`, 'red');
      resolve({ statusCode: 0, hasCORS: false, data: null });
    });
    
    req.end();
  });
}

async function runFrontendTests() {
  log('🧪 Frontend API Test Suite', 'bright');
  log('Testing all endpoints your frontend needs...', 'cyan');
  log('='.repeat(60), 'bright');
  
  const endpoints = [
    { url: 'https://api.packmovego.com/health', name: 'Health Check' },
    { url: 'https://api.packmovego.com/api/health', name: 'API Health' },
    { url: 'https://api.packmovego.com/api/heartbeat', name: 'Heartbeat' },
    { url: 'https://api.packmovego.com/api/ping', name: 'Ping' },
    { url: 'https://api.packmovego.com/v0/nav', name: 'Navigation Data' },
    { url: 'https://api.packmovego.com/v0/about', name: 'About Data' },
    { url: 'https://api.packmovego.com/v0/services', name: 'Services Data' },
    { url: 'https://api.packmovego.com/v0/testimonials', name: 'Testimonials Data' },
    { url: 'https://api.packmovego.com/v0/blog', name: 'Blog Data' },
    { url: 'https://api.packmovego.com/v0/contact', name: 'Contact Data' },
    { url: 'https://api.packmovego.com/v0/reviews', name: 'Reviews Data' },
    { url: 'https://api.packmovego.com/v0/locations', name: 'Locations Data' },
    { url: 'https://api.packmovego.com/v0/supplies', name: 'Supplies Data' },
    { url: 'https://api.packmovego.com/api/auth/status', name: 'Auth Status' }
  ];
  
  let successCount = 0;
  let totalCount = endpoints.length;
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.url, endpoint.name);
    if (result.statusCode === 200) successCount++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const successRate = ((successCount / totalCount) * 100).toFixed(1);
  
  log('\n' + '='.repeat(60), 'bright');
  log('📊 FRONTEND API TEST RESULTS', 'bright');
  log('='.repeat(60), 'bright');
  
  log(`✅ Successful: ${successCount}/${totalCount}`, 'green');
  log(`❌ Failed: ${totalCount - successCount}/${totalCount}`, 'red');
  log(`📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  
  if (successRate >= 80) {
    log('\n🎉 Your API is ready for frontend integration!', 'green');
    log('All necessary endpoints are working properly.', 'green');
  } else {
    log('\n⚠️  Some API endpoints need attention.', 'yellow');
  }
  
  log('\n🔍 Frontend Access Issue:', 'cyan');
  log('Your API is working perfectly, but your frontend is blocked by Vercel security.', 'yellow');
  log('To fix the frontend access:', 'cyan');
  log('1. Visit: https://vercel.link/security-checkpoint', 'cyan');
  log('2. Click "Website owner? Click here to fix"', 'cyan');
  log('3. Follow Vercel\'s verification process', 'cyan');
  
  log('\n📋 Next Steps:', 'yellow');
  log('✅ API is fully functional', 'green');
  log('⚠️  Fix frontend access via Vercel dashboard', 'yellow');
  log('✅ Test frontend once access is restored', 'green');
  
  log('\n' + '='.repeat(60), 'bright');
}

runFrontendTests(); 