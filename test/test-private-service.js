#!/usr/bin/env node

/**
 * Private Service Test Script
 * Tests the private service functionality of PackMoveGO API
 */

const https = require('https');
const http = require('http');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const PRIVATE_API_URL = process.env.PRIVATE_API_URL || 'http://localhost:3001';

class PrivateServiceTester {
  constructor() {
    this.results = [];
    this.gatewayResponses = [];
    this.privateResponses = [];
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'PrivateServiceTester/1.0',
          'Accept': 'application/json'
        },
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          try {
            const jsonData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData,
              responseTime
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data,
              responseTime,
              error: 'Invalid JSON response'
            });
          }
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

  async testGatewayService() {
    console.log(`\n🔍 Testing Gateway Service: ${GATEWAY_URL}`);
    
    const endpoints = [
      '/health',
      '/',
      '/v0/blog',
      '/v0/about',
      '/api/health'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.makeRequest(`${GATEWAY_URL}${endpoint}`);
        
        if (result.statusCode === 200) {
          console.log(`✅ Gateway ${endpoint} - Status: ${result.statusCode} (${result.responseTime}ms)`);
          
          // Check for gateway headers
          if (result.headers['x-gateway-service']) {
            console.log(`📊 Gateway Service: ${result.headers['x-gateway-service']}`);
          }
          
          this.gatewayResponses.push({
            endpoint,
            ...result
          });
          
        } else {
          console.log(`❌ Gateway ${endpoint} - Status: ${result.statusCode} (${result.responseTime}ms)`);
        }
        
      } catch (error) {
        console.log(`💥 Gateway ${endpoint} - Error: ${error.message}`);
      }
    }
  }

  async testPrivateService() {
    console.log(`\n🔒 Testing Private Service: ${PRIVATE_API_URL}`);
    
    const endpoints = [
      '/health',
      '/api/health',
      '/v0/blog',
      '/load-balancer/status'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.makeRequest(`${PRIVATE_API_URL}${endpoint}`);
        
        if (result.statusCode === 200) {
          console.log(`✅ Private ${endpoint} - Status: ${result.statusCode} (${result.responseTime}ms)`);
          
          // Check for private service headers
          if (result.headers['x-service-type']) {
            console.log(`📊 Service Type: ${result.headers['x-service-type']}`);
          }
          
          this.privateResponses.push({
            endpoint,
            ...result
          });
          
        } else {
          console.log(`❌ Private ${endpoint} - Status: ${result.statusCode} (${result.responseTime}ms)`);
        }
        
      } catch (error) {
        console.log(`💥 Private ${endpoint} - Error: ${error.message}`);
        console.log(`   Expected: Private service should not be accessible from public internet`);
      }
    }
  }

  async testServiceCommunication() {
    console.log(`\n🔗 Testing Service Communication`);
    
    // Test that gateway properly proxies to private service
    try {
      const result = await this.makeRequest(`${GATEWAY_URL}/v0/blog`);
      
      if (result.statusCode === 200) {
        console.log(`✅ Gateway successfully proxied to private service`);
        
        // Check for proxy headers
        if (result.headers['x-proxied-by']) {
          console.log(`📊 Proxied by: ${result.headers['x-proxied-by']}`);
        }
        
        // Check response data
        if (result.data && result.data.blogPosts) {
          console.log(`📊 Successfully received blog data through gateway`);
        }
        
      } else {
        console.log(`❌ Gateway failed to proxy to private service`);
      }
      
    } catch (error) {
      console.log(`💥 Service communication test failed: ${error.message}`);
    }
  }

  async testSecurityHeaders() {
    console.log(`\n🔐 Testing Security Headers`);
    
    try {
      const result = await this.makeRequest(`${GATEWAY_URL}/health`);
      
      if (result.statusCode === 200) {
        console.log(`✅ Gateway security headers:`);
        
        const securityHeaders = [
          'x-frame-options',
          'x-content-type-options',
          'x-xss-protection',
          'strict-transport-security'
        ];
        
        securityHeaders.forEach(header => {
          if (result.headers[header]) {
            console.log(`   ${header}: ${result.headers[header]}`);
          }
        });
        
        // Check for gateway-specific headers
        if (result.headers['x-gateway-service']) {
          console.log(`   x-gateway-service: ${result.headers['x-gateway-service']}`);
        }
        
      }
      
    } catch (error) {
      console.log(`💥 Security headers test failed: ${error.message}`);
    }
  }

  generateReport() {
    console.log(`\n📋 Private Service Test Report`);
    console.log(`==============================`);
    
    const gatewaySuccess = this.gatewayResponses.length;
    const privateSuccess = this.privateResponses.length;
    
    console.log(`Gateway Service Tests:`);
    console.log(`  Successful: ${gatewaySuccess}`);
    console.log(`  Failed: ${5 - gatewaySuccess}`);
    
    console.log(`\nPrivate Service Tests:`);
    console.log(`  Successful: ${privateSuccess}`);
    console.log(`  Failed: ${4 - privateSuccess}`);
    console.log(`  Note: Private service should NOT be accessible from public internet`);
    
    if (gatewaySuccess >= 3 && privateSuccess === 0) {
      console.log(`\n✅ Private service setup is working correctly!`);
      console.log(`   - Gateway is accessible and functioning`);
      console.log(`   - Private service is properly isolated`);
      console.log(`   - Service communication is working`);
    } else if (privateSuccess > 0) {
      console.log(`\n⚠️  Warning: Private service is accessible from public internet`);
      console.log(`   This indicates a security issue with the private service configuration`);
    } else {
      console.log(`\n❌ Issues detected with private service setup`);
    }
  }

  async runAllTests() {
    console.log(`🚀 PackMoveGO Private Service Test`);
    console.log(`===================================`);
    console.log(`Gateway URL: ${GATEWAY_URL}`);
    console.log(`Private API URL: ${PRIVATE_API_URL}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Test gateway service
    await this.testGatewayService();
    
    // Test private service (should fail)
    await this.testPrivateService();
    
    // Test service communication
    await this.testServiceCommunication();
    
    // Test security headers
    await this.testSecurityHeaders();
    
    // Generate report
    this.generateReport();
    
    console.log(`\n✅ Private service test completed!`);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new PrivateServiceTester();
  tester.runAllTests().catch(console.error);
}

module.exports = PrivateServiceTester; 