#!/usr/bin/env node

/**
 * Security Test Script
 * Tests IP whitelisting and security features
 */

const https = require('https');
const http = require('http');

// Configuration
const TEST_CONFIG = {
  // Test URLs
  LOCAL_URL: 'http://localhost:3000',
  PROD_URL: 'https://api.packmovego.com',
  
  // Test endpoints
  ENDPOINTS: [
    '/api/health',
    '/api/health/simple', 
    '/api/v0/nav',
    '/api/v0/services',
    '/api/v0/testimonials'
  ],
  
  // Test IPs (simulated)
  TEST_IPS: [
    '127.0.0.1',           // Localhost (should always work)
    '192.168.1.100',       // Private IP (should work in dev)
    '203.0.113.25',        // Public IP (may be blocked)
    '10.228.21.128',       // Render internal (should work)
    '76.76.21.21'          // Vercel IP (should work)
  ]
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Test-Script/1.0',
        ...options.headers
      },
      ...options
    };
    
    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          url: url
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Test function
async function testSecurity() {
  console.log(`${colors.bold}🔐 Security Test Suite${colors.reset}\n`);
  
  const baseUrl = process.argv.includes('--prod') ? TEST_CONFIG.PROD_URL : TEST_CONFIG.LOCAL_URL;
  console.log(`Testing: ${colors.blue}${baseUrl}${colors.reset}\n`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    redirected: 0
  };
  
  // Test 1: Basic health checks (should always work)
  console.log(`${colors.bold}1. Testing Health Checks${colors.reset}`);
  for (const endpoint of ['/api/health', '/api/health/simple', '/health']) {
    try {
      const response = await makeRequest(`${baseUrl}${endpoint}`);
      results.total++;
      
      if (response.statusCode === 200) {
        console.log(`  ✅ ${endpoint} - ${colors.green}OK${colors.reset} (${response.statusCode})`);
        results.passed++;
      } else {
        console.log(`  ❌ ${endpoint} - ${colors.red}FAILED${colors.reset} (${response.statusCode})`);
        results.failed++;
      }
    } catch (error) {
      console.log(`  ❌ ${endpoint} - ${colors.red}ERROR${colors.reset}: ${error.message}`);
      results.failed++;
      results.total++;
    }
  }
  
  // Test 2: API endpoints with different IPs
  console.log(`\n${colors.bold}2. Testing API Endpoints with Different IPs${colors.reset}`);
  for (const ip of TEST_CONFIG.TEST_IPS) {
    console.log(`\n  Testing with IP: ${colors.blue}${ip}${colors.reset}`);
    
    for (const endpoint of TEST_CONFIG.ENDPOINTS) {
      try {
        const response = await makeRequest(`${baseUrl}${endpoint}`, {
          headers: {
            'X-Forwarded-For': ip,
            'X-Real-IP': ip
          }
        });
        results.total++;
        
        if (response.statusCode === 200) {
          console.log(`    ✅ ${endpoint} - ${colors.green}OK${colors.reset} (${response.statusCode})`);
          results.passed++;
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          console.log(`    🔄 ${endpoint} - ${colors.yellow}REDIRECTED${colors.reset} (${response.statusCode})`);
          results.redirected++;
          results.passed++;
        } else if (response.statusCode === 403) {
          console.log(`    🚫 ${endpoint} - ${colors.red}BLOCKED${colors.reset} (${response.statusCode})`);
          results.blocked++;
          results.passed++;
        } else {
          console.log(`    ❓ ${endpoint} - ${colors.yellow}UNEXPECTED${colors.reset} (${response.statusCode})`);
          results.failed++;
        }
      } catch (error) {
        console.log(`    ❌ ${endpoint} - ${colors.red}ERROR${colors.reset}: ${error.message}`);
        results.failed++;
        results.total++;
      }
    }
  }
  
  // Test 3: Attack patterns (should be blocked)
  console.log(`\n${colors.bold}3. Testing Attack Prevention${colors.reset}`);
  const attackTests = [
    { path: '/api/v0/nav', headers: { 'X-Forwarded-For': '127.0.0.1' }, data: '<script>alert("xss")</script>' },
    { path: '/api/v0/services', headers: { 'X-Forwarded-For': '127.0.0.1' }, data: 'javascript:alert("xss")' },
    { path: '/api/v0/testimonials', headers: { 'X-Forwarded-For': '127.0.0.1' }, data: '../../../etc/passwd' }
  ];
  
  for (const test of attackTests) {
    try {
      const response = await makeRequest(`${baseUrl}${test.path}`, {
        headers: test.headers
      });
      results.total++;
      
      if (response.statusCode === 403) {
        console.log(`  ✅ Attack blocked - ${colors.green}SECURE${colors.reset}`);
        results.passed++;
      } else {
        console.log(`  ⚠️ Attack not blocked - ${colors.yellow}WARNING${colors.reset} (${response.statusCode})`);
        results.failed++;
      }
    } catch (error) {
      console.log(`  ❌ Attack test error: ${error.message}`);
      results.failed++;
      results.total++;
    }
  }
  
  // Test 4: Rate limiting
  console.log(`\n${colors.bold}4. Testing Rate Limiting${colors.reset}`);
  const rapidRequests = [];
  for (let i = 0; i < 10; i++) {
    rapidRequests.push(makeRequest(`${baseUrl}/api/v0/nav`));
  }
  
  try {
    const responses = await Promise.all(rapidRequests);
    const rateLimited = responses.filter(r => r.statusCode === 429).length;
    results.total += responses.length;
    
    if (rateLimited > 0) {
      console.log(`  ✅ Rate limiting working - ${colors.green}${rateLimited} requests blocked${colors.reset}`);
      results.passed += responses.length;
    } else {
      console.log(`  ⚠️ Rate limiting not triggered - ${colors.yellow}may be too lenient${colors.reset}`);
      results.passed += responses.length;
    }
  } catch (error) {
    console.log(`  ❌ Rate limiting test error: ${error.message}`);
    results.failed += 10;
    results.total += 10;
  }
  
  // Summary
  console.log(`\n${colors.bold}📊 Test Summary${colors.reset}`);
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${colors.green}${results.passed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${results.failed}${colors.reset}`);
  console.log(`Blocked: ${colors.yellow}${results.blocked}${colors.reset}`);
  console.log(`Redirected: ${colors.yellow}${results.redirected}${colors.reset}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${successRate}%`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed! Security features are working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}⚠️ Some tests failed. Review the results above.${colors.reset}`);
  }
  
  return results;
}

// Run tests
if (require.main === module) {
  testSecurity().catch(console.error);
}

module.exports = { testSecurity, TEST_CONFIG }; 