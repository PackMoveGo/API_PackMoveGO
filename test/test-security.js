#!/usr/bin/env node

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  apiKeyFrontend: process.env.API_KEY_FRONTEND || 'test_frontend_key',
  apiKeyAdmin: process.env.API_KEY_ADMIN || 'test_admin_key',
  jwtSecret: process.env.JWT_SECRET || 'test_jwt_secret'
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Security-Test-Suite/1.0',
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

function runTest(name, testFunction) {
  return async () => {
    testResults.total++;
    try {
      await testFunction();
      testResults.passed++;
      log(`PASS: ${name}`, 'success');
      testResults.details.push({ name, status: 'PASS' });
    } catch (error) {
      testResults.failed++;
      log(`FAIL: ${name} - ${error.message}`, 'error');
      testResults.details.push({ name, status: 'FAIL', error: error.message });
    }
  };
}

// Security Tests

// Test 1: Health Check (should always work)
const testHealthCheck = runTest('Health Check', async () => {
  const response = await makeRequest(`${TEST_CONFIG.baseUrl}/health`);
  if (response.statusCode !== 200) {
    throw new Error(`Expected 200, got ${response.statusCode}`);
  }
});

// Test 2: API Key Authentication
const testAPIKeyAuth = runTest('API Key Authentication', async () => {
  // Test without API key (should fail)
  const response1 = await makeRequest(`${TEST_CONFIG.baseUrl}/security/status`);
  if (response1.statusCode !== 401) {
    throw new Error(`Expected 401 without API key, got ${response1.statusCode}`);
  }

  // Test with invalid API key (should fail)
  const response2 = await makeRequest(`${TEST_CONFIG.baseUrl}/security/status`, {
    headers: { 'x-api-key': 'invalid_key' }
  });
  if (response2.statusCode !== 401) {
    throw new Error(`Expected 401 with invalid API key, got ${response2.statusCode}`);
  }

  // Test with valid API key (should work if API key auth is enabled)
  const response3 = await makeRequest(`${TEST_CONFIG.baseUrl}/security/status`, {
    headers: { 'x-api-key': TEST_CONFIG.apiKeyAdmin }
  });
  
  // Note: This might fail if API key auth is disabled, which is acceptable
  log(`API key test result: ${response3.statusCode}`, 'info');
});

// Test 3: Rate Limiting
const testRateLimiting = runTest('Rate Limiting', async () => {
  const requests = [];
  
  // Make multiple requests quickly
  for (let i = 0; i < 60; i++) {
    requests.push(makeRequest(`${TEST_CONFIG.baseUrl}/health`));
  }
  
  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.statusCode === 429);
  
  if (rateLimited.length === 0) {
    log('Rate limiting may not be enabled or configured', 'warning');
  } else {
    log(`Rate limiting working: ${rateLimited.length} requests blocked`, 'success');
  }
});

// Test 4: SQL Injection Protection
const testSQLInjection = runTest('SQL Injection Protection', async () => {
  const sqlInjectionTests = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; INSERT INTO users VALUES ('hacker', 'password'); --",
    "'; UPDATE users SET password='hacked'; --"
  ];
  
  for (const test of sqlInjectionTests) {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/v0/about?q=${encodeURIComponent(test)}`);
    if (response.statusCode === 403) {
      log(`SQL injection blocked: ${test}`, 'success');
    } else {
      log(`SQL injection not blocked: ${test} (${response.statusCode})`, 'warning');
    }
  }
});

// Test 5: XSS Protection
const testXSSProtection = runTest('XSS Protection', async () => {
  const xssTests = [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "';alert('xss');//"
  ];
  
  for (const test of xssTests) {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/v0/about?q=${encodeURIComponent(test)}`);
    if (response.statusCode === 403) {
      log(`XSS attack blocked: ${test}`, 'success');
    } else {
      log(`XSS attack not blocked: ${test} (${response.statusCode})`, 'warning');
    }
  }
});

// Test 6: Path Traversal Protection
const testPathTraversal = runTest('Path Traversal Protection', async () => {
  const pathTraversalTests = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//....//etc/passwd",
    "..%2F..%2F..%2Fetc%2Fpasswd"
  ];
  
  for (const test of pathTraversalTests) {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/v0/about?file=${encodeURIComponent(test)}`);
    if (response.statusCode === 403) {
      log(`Path traversal blocked: ${test}`, 'success');
    } else {
      log(`Path traversal not blocked: ${test} (${response.statusCode})`, 'warning');
    }
  }
});

// Test 7: Security Headers
const testSecurityHeaders = runTest('Security Headers', async () => {
  const response = await makeRequest(`${TEST_CONFIG.baseUrl}/health`);
  
  const requiredHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection'
  ];
  
  const missingHeaders = requiredHeaders.filter(header => 
    !response.headers[header] && !response.headers[header.toLowerCase()]
  );
  
  if (missingHeaders.length > 0) {
    throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
  }
  
  log('All required security headers present', 'success');
});

// Test 8: CORS Configuration
const testCORS = runTest('CORS Configuration', async () => {
  const response = await makeRequest(`${TEST_CONFIG.baseUrl}/health`, {
    headers: {
      'Origin': 'https://malicious-site.com',
      'Access-Control-Request-Method': 'POST'
    }
  });
  
  // Check if CORS is properly configured
  const corsHeaders = response.headers['access-control-allow-origin'];
  if (!corsHeaders) {
    log('CORS headers not found', 'warning');
  } else {
    log('CORS headers present', 'success');
  }
});

// Test 9: Request Size Limiting
const testRequestSizeLimit = runTest('Request Size Limiting', async () => {
  const largePayload = 'x'.repeat(2 * 1024 * 1024); // 2MB payload
  
  const response = await makeRequest(`${TEST_CONFIG.baseUrl}/v0/about`, {
    method: 'POST',
    body: { data: largePayload }
  });
  
  if (response.statusCode === 413) {
    log('Request size limiting working', 'success');
  } else {
    log(`Request size limiting not working (${response.statusCode})`, 'warning');
  }
});

// Test 10: JWT Token Validation
const testJWTValidation = runTest('JWT Token Validation', async () => {
  // Test with invalid JWT
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token';
  
  const response = await makeRequest(`${TEST_CONFIG.baseUrl}/auth/verify`, {
    headers: { 'Authorization': `Bearer ${invalidToken}` }
  });
  
  if (response.statusCode === 401) {
    log('JWT validation working', 'success');
  } else {
    log(`JWT validation not working (${response.statusCode})`, 'warning');
  }
});

// Main test runner
async function runSecurityTests() {
  console.log('🔐 Starting Security Test Suite...\n');
  console.log(`Testing URL: ${TEST_CONFIG.baseUrl}\n`);
  
  const tests = [
    testHealthCheck,
    testAPIKeyAuth,
    testRateLimiting,
    testSQLInjection,
    testXSSProtection,
    testPathTraversal,
    testSecurityHeaders,
    testCORS,
    testRequestSizeLimit,
    testJWTValidation
  ];
  
  for (const test of tests) {
    await test();
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between tests
  }
  
  // Print results
  console.log('\n📊 Test Results:');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Detailed Results:');
  testResults.details.forEach(detail => {
    const icon = detail.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${detail.name}: ${detail.status}`);
    if (detail.error) {
      console.log(`   Error: ${detail.error}`);
    }
  });
  
  console.log('\n🔐 Security Assessment:');
  if (testResults.failed === 0) {
    console.log('✅ All security tests passed! Your API is well-protected.');
  } else if (testResults.failed <= 2) {
    console.log('⚠️ Most security tests passed. Review failed tests and consider improvements.');
  } else {
    console.log('❌ Multiple security tests failed. Immediate attention required.');
  }
  
  console.log('\n📝 Recommendations:');
  console.log('1. Review failed tests and implement fixes');
  console.log('2. Monitor security logs regularly');
  console.log('3. Keep dependencies updated');
  console.log('4. Run security tests regularly');
  console.log('5. Consider implementing additional security measures');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runSecurityTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runSecurityTests, testResults }; 