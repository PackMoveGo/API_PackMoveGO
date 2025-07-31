#!/usr/bin/env node

/**
 * 🚀 PackMoveGO API Testing Script
 * 
 * This script tests all major endpoints of api.packmovego.com
 * to ensure the API works as intended.
 * 
 * Usage:
 *   node test-api-endpoints.js
 *   node test-api-endpoints.js --verbose
 *   node test-api-endpoints.js --endpoint=/auth/login
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const API_BASE_URL = 'https://api.packmovego.com';
const LOCAL_BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  email: 'test@packmovego.com',
  password: 'testpassword123'
};

const testAdminCredentials = {
  email: 'admin@packmovego.com',
  password: 'packmovego2024'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  const color = status === 'PASS' ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  if (details) {
    log(`   ${details}`, 'yellow');
  }
  
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  testResults.details.push({
    name,
    status,
    details,
    timestamp: new Date().toISOString()
  });
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PackMoveGO-API-Tester/1.0',
        ...options.headers
      }
    };
    
    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }
    
    const req = client.request(requestOptions, (res) => {
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

// Test functions
async function testHealthEndpoints() {
  log('\n🔍 Testing Health Endpoints...', 'cyan');
  
  const healthEndpoints = [
    '/health',
    '/api/health',
    '/api/heartbeat',
    '/api/ping',
    '/analytics/health'
  ];
  
  for (const endpoint of healthEndpoints) {
    try {
      const response = await makeRequest(`${API_BASE_URL}${endpoint}`);
      
      if (response.statusCode === 200) {
        logTest(`Health Check: ${endpoint}`, 'PASS', `Status: ${response.statusCode}`);
      } else {
        logTest(`Health Check: ${endpoint}`, 'FAIL', `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logTest(`Health Check: ${endpoint}`, 'FAIL', `Error: ${error.message}`);
    }
  }
}

async function testDataEndpoints() {
  log('\n📊 Testing Data Endpoints...', 'cyan');
  
  const dataEndpoints = [
    '/data/about',
    '/data/blog',
    '/data/contact',
    '/data/locations',
    '/data/nav',
    '/data/reviews',
    '/data/services',
    '/data/supplies',
    '/data/testimonials',
    '/v0/about',
    '/v0/blog',
    '/v0/contact',
    '/v0/locations',
    '/v0/nav',
    '/v0/reviews',
    '/v0/services',
    '/v0/supplies',
    '/v0/testimonials'
  ];
  
  for (const endpoint of dataEndpoints) {
    try {
      const response = await makeRequest(`${API_BASE_URL}${endpoint}`);
      
      if (response.statusCode === 200) {
        const hasData = response.data && Object.keys(response.data).length > 0;
        logTest(`Data Endpoint: ${endpoint}`, 'PASS', `Status: ${response.statusCode}, Has Data: ${hasData}`);
      } else {
        logTest(`Data Endpoint: ${endpoint}`, 'FAIL', `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logTest(`Data Endpoint: ${endpoint}`, 'FAIL', `Error: ${error.message}`);
    }
  }
}

async function testAuthEndpoints() {
  log('\n🔐 Testing Authentication Endpoints...', 'cyan');
  
  // Test login endpoint
  try {
    const loginResponse = await makeRequest(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(testUser)
    });
    
    if (loginResponse.statusCode === 200 || loginResponse.statusCode === 401) {
      logTest('Auth: Login Endpoint', 'PASS', `Status: ${loginResponse.statusCode}`);
    } else {
      logTest('Auth: Login Endpoint', 'FAIL', `Status: ${loginResponse.statusCode}`);
    }
  } catch (error) {
    logTest('Auth: Login Endpoint', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test register endpoint
  try {
    const registerResponse = await makeRequest(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(testUser)
    });
    
    if (registerResponse.statusCode === 200 || registerResponse.statusCode === 400 || registerResponse.statusCode === 409) {
      logTest('Auth: Register Endpoint', 'PASS', `Status: ${registerResponse.statusCode}`);
    } else {
      logTest('Auth: Register Endpoint', 'FAIL', `Status: ${registerResponse.statusCode}`);
    }
  } catch (error) {
    logTest('Auth: Register Endpoint', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test auth verification
  try {
    const verifyResponse = await makeRequest(`${API_BASE_URL}/auth/verify`);
    
    if (verifyResponse.statusCode === 200 || verifyResponse.statusCode === 401) {
      logTest('Auth: Verify Endpoint', 'PASS', `Status: ${verifyResponse.statusCode}`);
    } else {
      logTest('Auth: Verify Endpoint', 'FAIL', `Status: ${verifyResponse.statusCode}`);
    }
  } catch (error) {
    logTest('Auth: Verify Endpoint', 'FAIL', `Error: ${error.message}`);
  }
}

async function testServicesEndpoints() {
  log('\n🚚 Testing Services Endpoints...', 'cyan');
  
  const servicesEndpoints = [
    '/v1/services',
    '/v1/services/analytics'
  ];
  
  for (const endpoint of servicesEndpoints) {
    try {
      const response = await makeRequest(`${API_BASE_URL}${endpoint}`);
      
      if (response.statusCode === 200) {
        const hasData = response.data && (Array.isArray(response.data) || Object.keys(response.data).length > 0);
        logTest(`Services: ${endpoint}`, 'PASS', `Status: ${response.statusCode}, Has Data: ${hasData}`);
      } else {
        logTest(`Services: ${endpoint}`, 'FAIL', `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logTest(`Services: ${endpoint}`, 'FAIL', `Error: ${error.message}`);
    }
  }
}

async function testAnalyticsEndpoints() {
  log('\n📈 Testing Analytics Endpoints...', 'cyan');
  
  const analyticsEndpoints = [
    '/analytics/performance',
    '/analytics/realtime',
    '/analytics/export'
  ];
  
  for (const endpoint of analyticsEndpoints) {
    try {
      const response = await makeRequest(`${API_BASE_URL}${endpoint}`);
      
      if (response.statusCode === 200 || response.statusCode === 401) {
        logTest(`Analytics: ${endpoint}`, 'PASS', `Status: ${response.statusCode}`);
      } else {
        logTest(`Analytics: ${endpoint}`, 'FAIL', `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logTest(`Analytics: ${endpoint}`, 'FAIL', `Error: ${error.message}`);
    }
  }
}

async function testSecurityEndpoints() {
  log('\n🔒 Testing Security Endpoints...', 'cyan');
  
  const securityEndpoints = [
    '/security/verify-sections'
  ];
  
  for (const endpoint of securityEndpoints) {
    try {
      const response = await makeRequest(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ test: true })
      });
      
      if (response.statusCode === 200 || response.statusCode === 400) {
        logTest(`Security: ${endpoint}`, 'PASS', `Status: ${response.statusCode}`);
      } else {
        logTest(`Security: ${endpoint}`, 'FAIL', `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logTest(`Security: ${endpoint}`, 'FAIL', `Error: ${error.message}`);
    }
  }
}

async function testPrelaunchEndpoints() {
  log('\n🚀 Testing Prelaunch Endpoints...', 'cyan');
  
  const prelaunchEndpoints = [
    '/prelaunch/subscribers',
    '/prelaunch/early_subscribers'
  ];
  
  for (const endpoint of prelaunchEndpoints) {
    try {
      const response = await makeRequest(`${API_BASE_URL}${endpoint}`);
      
      if (response.statusCode === 200 || response.statusCode === 401) {
        logTest(`Prelaunch: ${endpoint}`, 'PASS', `Status: ${response.statusCode}`);
      } else {
        logTest(`Prelaunch: ${endpoint}`, 'FAIL', `Status: ${response.statusCode}`);
      }
    } catch (error) {
      logTest(`Prelaunch: ${endpoint}`, 'FAIL', `Error: ${error.message}`);
    }
  }
}

async function testCORSHeaders() {
  log('\n🌐 Testing CORS Headers...', 'cyan');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/health`, {
      headers: {
        'Origin': 'https://www.packmovego.com'
      }
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    const hasCORS = corsHeaders && (corsHeaders === '*' || corsHeaders.includes('packmovego.com'));
    
    if (hasCORS) {
      logTest('CORS Headers', 'PASS', `CORS Origin: ${corsHeaders}`);
    } else {
      logTest('CORS Headers', 'FAIL', `CORS Origin: ${corsHeaders}`);
    }
  } catch (error) {
    logTest('CORS Headers', 'FAIL', `Error: ${error.message}`);
  }
}

async function testResponseTime() {
  log('\n⏱️ Testing Response Times...', 'cyan');
  
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/health`);
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 1000) {
      logTest('Response Time', 'PASS', `${responseTime}ms`);
    } else {
      logTest('Response Time', 'FAIL', `${responseTime}ms (slow)`);
    }
  } catch (error) {
    logTest('Response Time', 'FAIL', `Error: ${error.message}`);
  }
}

async function testSSLConnection() {
  log('\n🔐 Testing SSL Connection...', 'cyan');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/health`);
    logTest('SSL Connection', 'PASS', 'HTTPS connection successful');
  } catch (error) {
    logTest('SSL Connection', 'FAIL', `Error: ${error.message}`);
  }
}

function printSummary() {
  log('\n' + '='.repeat(60), 'bright');
  log('📊 TEST SUMMARY', 'bright');
  log('='.repeat(60), 'bright');
  
  log(`✅ Passed: ${testResults.passed}`, 'green');
  log(`❌ Failed: ${testResults.failed}`, 'red');
  log(`📈 Total: ${testResults.total}`, 'blue');
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  log(`🎯 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    testResults.details
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        log(`   - ${test.name}: ${test.details}`, 'red');
      });
  }
  
  log('\n' + '='.repeat(60), 'bright');
}

// Main execution
async function runTests() {
  log('🚀 PackMoveGO API Testing Suite', 'bright');
  log('Testing: ' + API_BASE_URL, 'cyan');
  log('Timestamp: ' + new Date().toISOString(), 'cyan');
  log('='.repeat(60), 'bright');
  
  try {
    await testHealthEndpoints();
    await testDataEndpoints();
    await testAuthEndpoints();
    await testServicesEndpoints();
    await testAnalyticsEndpoints();
    await testSecurityEndpoints();
    await testPrelaunchEndpoints();
    await testCORSHeaders();
    await testResponseTime();
    await testSSLConnection();
    
    printSummary();
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`\n💥 Test suite failed with error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const specificEndpoint = args.find(arg => arg.startsWith('--endpoint='));

if (specificEndpoint) {
  const endpoint = specificEndpoint.split('=')[1];
  log(`🎯 Testing specific endpoint: ${endpoint}`, 'cyan');
  // Add specific endpoint testing logic here
}

// Run the tests
runTests(); 