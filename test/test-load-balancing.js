#!/usr/bin/env node

/**
 * Load Balancing Test Script
 * Tests the load balancing functionality of PackMoveGO API
 */

const https = require('https');
const http = require('http');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_ENDPOINTS = [
  '/api/health',
  '/load-balancer/status',
  '/load-balancer/instance',
  '/load-balancer/health'
];

class LoadBalancingTester {
  constructor() {
    this.results = [];
    this.instanceIds = new Set();
    this.responseTimes = [];
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'LoadBalancingTester/1.0',
          'Accept': 'application/json',
          'Origin': 'http://localhost:3000'
        },
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          this.responseTimes.push(responseTime);
          
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

  async testEndpoint(endpoint) {
    console.log(`\n🔍 Testing endpoint: ${endpoint}`);
    
    try {
      const result = await this.makeRequest(`${API_BASE_URL}${endpoint}`);
      
      if (result.statusCode === 200) {
        console.log(`✅ ${endpoint} - Status: ${result.statusCode} (${result.responseTime}ms)`);
        
        // Track instance ID if available
        if (result.headers['x-instance-id']) {
          this.instanceIds.add(result.headers['x-instance-id']);
          console.log(`📊 Instance ID: ${result.headers['x-instance-id']}`);
        }
        
        // Display response data for certain endpoints
        if (endpoint === '/load-balancer/status') {
          console.log(`📈 Load Balancer Status:`, {
            enabled: result.data.loadBalancer?.enabled,
            instanceId: result.data.loadBalancer?.instanceId,
            totalInstances: result.data.loadBalancer?.totalInstances,
            memoryUsage: result.data.loadBalancer?.memoryUsage,
            requestsPerSecond: result.data.loadBalancer?.requestsPerSecond
          });
        }
        
        if (endpoint === '/load-balancer/instance') {
          console.log(`🏠 Instance Info:`, {
            instanceId: result.data.instance?.instanceId,
            uptime: result.data.instance?.uptime,
            requestsHandled: result.data.instance?.requestsHandled,
            status: result.data.instance?.status
          });
        }
        
      } else {
        console.log(`❌ ${endpoint} - Status: ${result.statusCode} (${result.responseTime}ms)`);
      }
      
      this.results.push({
        endpoint,
        ...result
      });
      
    } catch (error) {
      console.log(`💥 ${endpoint} - Error: ${error.message}`);
      this.results.push({
        endpoint,
        error: error.message
      });
    }
  }

  async runConcurrentTest(concurrency = 5) {
    console.log(`\n🚀 Running concurrent test with ${concurrency} requests...`);
    
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.makeRequest(`${API_BASE_URL}/load-balancer/instance`));
    }
    
    try {
      const results = await Promise.all(promises);
      const instanceIds = results
        .filter(r => r.headers['x-instance-id'])
        .map(r => r.headers['x-instance-id']);
      
      console.log(`📊 Concurrent test results:`);
      console.log(`   Total requests: ${results.length}`);
      console.log(`   Successful: ${results.filter(r => r.statusCode === 200).length}`);
      console.log(`   Unique instances: ${new Set(instanceIds).size}`);
      console.log(`   Instance IDs: ${[...new Set(instanceIds)].join(', ')}`);
      
      if (new Set(instanceIds).size > 1) {
        console.log(`✅ Load balancing is working! Multiple instances detected.`);
      } else {
        console.log(`⚠️  Only one instance detected. Load balancing may not be active.`);
      }
      
    } catch (error) {
      console.log(`💥 Concurrent test failed: ${error.message}`);
    }
  }

  async runSessionStickinessTest() {
    console.log(`\n🔗 Testing session stickiness...`);
    
    const sessionId = `test-session-${Date.now()}`;
    const results = [];
    
    for (let i = 0; i < 5; i++) {
      try {
        const result = await this.makeRequest(`${API_BASE_URL}/load-balancer/instance`, {
          headers: {
            'X-Session-ID': sessionId
          }
        });
        
        if (result.statusCode === 200 && result.headers['x-instance-id']) {
          results.push(result.headers['x-instance-id']);
        }
      } catch (error) {
        console.log(`💥 Session test request ${i + 1} failed: ${error.message}`);
      }
    }
    
    const uniqueInstances = new Set(results);
    console.log(`📊 Session stickiness test:`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Requests made: 5`);
    console.log(`   Unique instances: ${uniqueInstances.size}`);
    console.log(`   Instance IDs: ${[...uniqueInstances].join(', ')}`);
    
    if (uniqueInstances.size === 1) {
      console.log(`✅ Session stickiness is working! All requests went to same instance.`);
    } else {
      console.log(`⚠️  Session stickiness may not be configured or working.`);
    }
  }

  generateReport() {
    console.log(`\n📋 Test Report`);
    console.log(`==============`);
    
    const successfulTests = this.results.filter(r => r.statusCode === 200);
    const failedTests = this.results.filter(r => r.statusCode !== 200);
    
    console.log(`Total tests: ${this.results.length}`);
    console.log(`Successful: ${successfulTests.length}`);
    console.log(`Failed: ${failedTests.length}`);
    console.log(`Success rate: ${((successfulTests.length / this.results.length) * 100).toFixed(1)}%`);
    
    if (this.responseTimes.length > 0) {
      const avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
      const minResponseTime = Math.min(...this.responseTimes);
      const maxResponseTime = Math.max(...this.responseTimes);
      
      console.log(`\n⏱️  Response Times:`);
      console.log(`   Average: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`   Min: ${minResponseTime}ms`);
      console.log(`   Max: ${maxResponseTime}ms`);
    }
    
    console.log(`\n🏠 Instances Detected: ${this.instanceIds.size}`);
    if (this.instanceIds.size > 0) {
      console.log(`   Instance IDs: ${[...this.instanceIds].join(', ')}`);
    }
    
    if (failedTests.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      failedTests.forEach(test => {
        console.log(`   ${test.endpoint}: ${test.statusCode || 'Error'}`);
      });
    }
  }

  async runAllTests() {
    console.log(`🚀 PackMoveGO Load Balancing Test`);
    console.log(`================================`);
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Test individual endpoints
    for (const endpoint of TEST_ENDPOINTS) {
      await this.testEndpoint(endpoint);
    }
    
    // Test concurrent requests
    await this.runConcurrentTest(10);
    
    // Test session stickiness
    await this.runSessionStickinessTest();
    
    // Generate report
    this.generateReport();
    
    console.log(`\n✅ Load balancing test completed!`);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new LoadBalancingTester();
  tester.runAllTests().catch(console.error);
}

module.exports = LoadBalancingTester; 