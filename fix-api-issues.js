#!/usr/bin/env node

/**
 * 🔧 PackMoveGO API Issue Diagnosis & Fix Script
 * 
 * This script identifies and provides solutions for the API issues:
 * 1. CORS headers not being set properly
 * 2. v0/nav returning 500 error
 * 3. Missing endpoints returning 404
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
        'User-Agent': 'PackMoveGO-API-Diagnostic/1.0',
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

async function diagnoseCORS() {
  log('\n🔍 Diagnosing CORS Issues...', 'cyan');
  
  const origins = [
    'https://www.packmovego.com',
    'https://packmovego.com',
    'http://localhost:3000',
    'https://api.packmovego.com'
  ];
  
  for (const origin of origins) {
    try {
      const response = await makeRequest('https://api.packmovego.com/health', {
        headers: {
          'Origin': origin
        }
      });
      
      const corsHeader = response.headers['access-control-allow-origin'];
      const hasCORS = corsHeader && (corsHeader === '*' || corsHeader.includes('packmovego.com'));
      
      if (hasCORS) {
        log(`✅ CORS for ${origin}: ${corsHeader}`, 'green');
      } else {
        log(`❌ CORS for ${origin}: ${corsHeader || 'missing'}`, 'red');
      }
    } catch (error) {
      log(`❌ CORS test failed for ${origin}: ${error.message}`, 'red');
    }
  }
}

async function diagnoseV0Routes() {
  log('\n🔍 Diagnosing v0 Routes...', 'cyan');
  
  const v0Endpoints = [
    '/v0/nav',
    '/v0/about',
    '/v0/services',
    '/v0/testimonials',
    '/v0/blog',
    '/v0/contact',
    '/v0/reviews',
    '/v0/locations',
    '/v0/supplies'
  ];
  
  for (const endpoint of v0Endpoints) {
    try {
      const response = await makeRequest(`https://api.packmovego.com${endpoint}`);
      
      if (response.statusCode === 200) {
        const hasData = response.data && Object.keys(response.data).length > 0;
        log(`✅ ${endpoint}: Status ${response.statusCode}, Has Data: ${hasData}`, 'green');
      } else if (response.statusCode === 500) {
        log(`❌ ${endpoint}: Status ${response.statusCode} - Server Error`, 'red');
        if (response.data && response.data.error) {
          log(`   Error: ${response.data.error}`, 'yellow');
        }
      } else {
        log(`❌ ${endpoint}: Status ${response.statusCode}`, 'red');
      }
    } catch (error) {
      log(`❌ ${endpoint}: ${error.message}`, 'red');
    }
  }
}

async function diagnoseAuthEndpoints() {
  log('\n🔍 Diagnosing Auth Endpoints...', 'cyan');
  
  const authEndpoints = [
    '/api/auth/status',
    '/auth/login',
    '/auth/register',
    '/auth/verify'
  ];
  
  for (const endpoint of authEndpoints) {
    try {
      const response = await makeRequest(`https://api.packmovego.com${endpoint}`);
      
      if (response.statusCode === 200 || response.statusCode === 401) {
        log(`✅ ${endpoint}: Status ${response.statusCode}`, 'green');
      } else {
        log(`❌ ${endpoint}: Status ${response.statusCode}`, 'red');
      }
    } catch (error) {
      log(`❌ ${endpoint}: ${error.message}`, 'red');
    }
  }
}

function printSolutions() {
  log('\n' + '='.repeat(60), 'bright');
  log('🔧 SOLUTIONS FOR API ISSUES', 'bright');
  log('='.repeat(60), 'bright');
  
  log('\n📋 Issue 1: CORS Headers Not Set', 'yellow');
  log('Problem: CORS headers are not being set properly for cross-origin requests', 'red');
  log('Solution:', 'green');
  log('1. Check that CORS middleware is applied BEFORE route handlers');
  log('2. Ensure CORS configuration includes all necessary origins');
  log('3. Add explicit CORS headers in route handlers if needed');
  
  log('\n📋 Issue 2: v0/nav Returns 500 Error', 'yellow');
  log('Problem: The v0/nav endpoint is returning a server error', 'red');
  log('Solution:', 'green');
  log('1. Check that nav.json file exists in src/data/');
  log('2. Verify the file can be loaded by the require() statement');
  log('3. Add error handling for file loading');
  
  log('\n📋 Issue 3: Missing Endpoints (404)', 'yellow');
  log('Problem: Several endpoints are returning 404 Not Found', 'red');
  log('Solution:', 'green');
  log('1. Verify all route files are properly imported');
  log('2. Check that routes are mounted in the correct order');
  log('3. Ensure route handlers are properly defined');
  
  log('\n📋 Issue 4: CORS Preflight Issues', 'yellow');
  log('Problem: OPTIONS requests are not being handled properly', 'red');
  log('Solution:', 'green');
  log('1. Add OPTIONS handlers for all endpoints');
  log('2. Ensure CORS middleware handles preflight requests');
  log('3. Set proper CORS headers for all responses');
  
  log('\n🔧 IMMEDIATE FIXES NEEDED:', 'bright');
  log('1. Fix CORS middleware order in server.ts', 'cyan');
  log('2. Add error handling to v0 routes', 'cyan');
  log('3. Verify all data files exist and are accessible', 'cyan');
  log('4. Add missing route handlers', 'cyan');
  
  log('\n' + '='.repeat(60), 'bright');
}

async function runDiagnosis() {
  log('🔧 PackMoveGO API Issue Diagnosis', 'bright');
  log('Testing: https://api.packmovego.com', 'cyan');
  log('Timestamp: ' + new Date().toISOString(), 'cyan');
  log('='.repeat(60), 'bright');
  
  try {
    await diagnoseCORS();
    await diagnoseV0Routes();
    await diagnoseAuthEndpoints();
    printSolutions();
  } catch (error) {
    log(`\n💥 Diagnosis failed: ${error.message}`, 'red');
  }
}

runDiagnosis(); 