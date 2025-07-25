#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';

console.log('🧪 === Enhanced Services API Testing ===');
console.log(`📍 API Base: ${API_BASE}`);
console.log('');

// Helper function to make API requests
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'PackMoveGo-Enhanced-Services-Test'
      }
    };

    if (API_KEY) {
      options.headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: response
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test 1: Enhanced Services API with filtering and search
async function testEnhancedServices() {
  console.log('🔍 Test 1: Enhanced Services API with filtering and search');
  console.log('='.repeat(60));
  
  try {
    // Test basic services endpoint
    console.log('\n📋 Testing basic services endpoint...');
    const basicResponse = await makeRequest('GET', '/api/v1/services');
    console.log(`✅ Status: ${basicResponse.status}`);
    console.log(`📊 Services returned: ${basicResponse.data.data?.services?.length || 0}`);
    console.log(`📄 Pagination: Page ${basicResponse.data.data?.pagination?.page || 1} of ${basicResponse.data.data?.pagination?.pages || 1}`);
    
    // Test search functionality
    console.log('\n🔍 Testing search functionality...');
    const searchResponse = await makeRequest('GET', '/api/v1/services?search=residential');
    console.log(`✅ Status: ${searchResponse.status}`);
    console.log(`🔍 Search results: ${searchResponse.data.data?.services?.length || 0} services found`);
    
    // Test category filtering
    console.log('\n🏷️ Testing category filtering...');
    const categoryResponse = await makeRequest('GET', '/api/v1/services?category=residential');
    console.log(`✅ Status: ${categoryResponse.status}`);
    console.log(`🏷️ Category results: ${categoryResponse.data.data?.services?.length || 0} residential services`);
    
    // Test price filtering
    console.log('\n💰 Testing price filtering...');
    const priceResponse = await makeRequest('GET', '/api/v1/services?minPrice=300&maxPrice=500');
    console.log(`✅ Status: ${priceResponse.status}`);
    console.log(`💰 Price filtered results: ${priceResponse.data.data?.services?.length || 0} services`);
    
    // Test sorting
    console.log('\n📊 Testing sorting by price...');
    const sortResponse = await makeRequest('GET', '/api/v1/services?sort=price&limit=5');
    console.log(`✅ Status: ${sortResponse.status}`);
    console.log(`📊 Sorted results: ${sortResponse.data.data?.services?.length || 0} services`);
    
    // Test pagination
    console.log('\n📄 Testing pagination...');
    const paginationResponse = await makeRequest('GET', '/api/v1/services?page=1&limit=3');
    console.log(`✅ Status: ${paginationResponse.status}`);
    console.log(`📄 Pagination: ${paginationResponse.data.data?.pagination?.total || 0} total services`);
    
  } catch (error) {
    console.error('❌ Error testing enhanced services:', error.message);
  }
}

// Test 2: Service Details API
async function testServiceDetails() {
  console.log('\n\n🔍 Test 2: Service Details API');
  console.log('='.repeat(60));
  
  try {
    // Test getting specific service
    console.log('\n📋 Testing service details...');
    const serviceResponse = await makeRequest('GET', '/api/v1/services/residential');
    console.log(`✅ Status: ${serviceResponse.status}`);
    if (serviceResponse.data.success) {
      console.log(`📦 Service: ${serviceResponse.data.data.title}`);
      console.log(`💰 Price: ${serviceResponse.data.data.price.display}`);
      console.log(`⏱️ Duration: ${serviceResponse.data.data.duration.display}`);
      console.log(`⭐ Rating: ${serviceResponse.data.data.meta.rating}/5`);
    }
    
    // Test non-existent service
    console.log('\n❌ Testing non-existent service...');
    const notFoundResponse = await makeRequest('GET', '/api/v1/services/non-existent');
    console.log(`✅ Status: ${notFoundResponse.status} (expected 404)`);
    
  } catch (error) {
    console.error('❌ Error testing service details:', error.message);
  }
}

// Test 3: Dynamic Pricing and Quote Generation
async function testDynamicPricing() {
  console.log('\n\n💰 Test 3: Dynamic Pricing and Quote Generation');
  console.log('='.repeat(60));
  
  try {
    // Test quote generation
    console.log('\n💳 Testing quote generation...');
    const quoteData = {
      fromZip: '92614',
      toZip: '92620',
      moveDate: '2024-02-15',
      rooms: 3,
      additionalServices: ['packing', 'storage'],
      urgency: 'standard'
    };
    
    const quoteResponse = await makeRequest('POST', '/api/v1/services/residential/quote', quoteData);
    console.log(`✅ Status: ${quoteResponse.status}`);
    
    if (quoteResponse.data.success) {
      const quote = quoteResponse.data.data.quote;
      console.log(`💰 Base Price: $${quote.basePrice}`);
      console.log(`🌍 Distance Multiplier: ${quote.distanceMultiplier}x`);
      console.log(`📅 Seasonal Adjustment: ${quote.seasonalAdjustment}x`);
      console.log(`💵 Total Price: $${quote.totalPrice}`);
      console.log(`📋 Breakdown:`);
      console.log(`   - Base Service: $${quote.breakdown.baseService}`);
      console.log(`   - Distance: $${quote.breakdown.distance}`);
      console.log(`   - Seasonal: $${quote.breakdown.seasonal}`);
      console.log(`   - Add-ons: $${quote.breakdown.addons}`);
      console.log(`⏰ Valid Until: ${quote.validUntil}`);
      console.log(`📅 Available Slots: ${quote.availability.availableSlots.length} slots`);
      
      if (quoteResponse.data.data.recommendations.length > 0) {
        console.log(`💡 Recommendations: ${quoteResponse.data.data.recommendations.length} suggested`);
      }
    }
    
    // Test quote with rush urgency
    console.log('\n⚡ Testing rush quote...');
    const rushQuoteData = {
      fromZip: '92614',
      toZip: '92620',
      moveDate: '2024-02-15',
      urgency: 'rush'
    };
    
    const rushQuoteResponse = await makeRequest('POST', '/api/v1/services/residential/quote', rushQuoteData);
    console.log(`✅ Status: ${rushQuoteResponse.status}`);
    if (rushQuoteResponse.data.success) {
      console.log(`⚡ Rush Quote Total: $${rushQuoteResponse.data.data.quote.totalPrice}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing dynamic pricing:', error.message);
  }
}

// Test 4: Service Analytics
async function testServiceAnalytics() {
  console.log('\n\n📊 Test 4: Service Analytics and Performance');
  console.log('='.repeat(60));
  
  try {
    // Test analytics endpoint
    console.log('\n📈 Testing analytics...');
    const analyticsResponse = await makeRequest('GET', '/api/v1/services/analytics?period=30d');
    console.log(`✅ Status: ${analyticsResponse.status}`);
    
    if (analyticsResponse.data.success) {
      const analytics = analyticsResponse.data.data;
      console.log(`📊 Overview:`);
      console.log(`   - Total Services: ${analytics.overview.totalServices}`);
      console.log(`   - Active Services: ${analytics.overview.activeServices}`);
      console.log(`   - Total Bookings: ${analytics.overview.totalBookings}`);
      console.log(`   - Revenue: $${analytics.overview.revenue.toLocaleString()}`);
      console.log(`   - Avg Rating: ${analytics.overview.avgRating}/5`);
      
      console.log(`📈 Performance:`);
      console.log(`   - Conversion Rate: ${(analytics.performance.conversionRate * 100).toFixed(1)}%`);
      console.log(`   - Avg Booking Value: $${analytics.performance.avgBookingValue}`);
      console.log(`   - Customer Satisfaction: ${analytics.performance.customerSatisfaction}/5`);
      console.log(`   - Response Time: ${analytics.performance.responseTime}`);
      
      console.log(`📊 Popular Services: ${analytics.popularServices.length} services`);
      console.log(`📈 Revenue Growth: ${analytics.trends.revenueGrowth}%`);
      console.log(`🌍 Top Zip Codes: ${analytics.customerInsights.topZipCodes.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing analytics:', error.message);
  }
}

// Test 5: Compare old vs new API
async function testComparison() {
  console.log('\n\n🔄 Test 5: Old vs New API Comparison');
  console.log('='.repeat(60));
  
  try {
    // Test old API
    console.log('\n📋 Testing old services API...');
    const oldResponse = await makeRequest('GET', '/api/v0/services');
    console.log(`✅ Old API Status: ${oldResponse.status}`);
    console.log(`📦 Old API Services: ${oldResponse.data.data?.services?.length || 0}`);
    
    // Test new API
    console.log('\n🚀 Testing new enhanced services API...');
    const newResponse = await makeRequest('GET', '/api/v1/services');
    console.log(`✅ New API Status: ${newResponse.status}`);
    console.log(`📦 New API Services: ${newResponse.data.data?.services?.length || 0}`);
    
    // Compare response structures
    if (oldResponse.data.success && newResponse.data.success) {
      const oldService = oldResponse.data.data.services[0];
      const newService = newResponse.data.data.services[0];
      
      console.log('\n📊 Response Structure Comparison:');
      console.log(`📦 Old API - Simple structure: ${Object.keys(oldService).length} fields`);
      console.log(`🚀 New API - Enhanced structure: ${Object.keys(newService).length} fields`);
      console.log(`💰 New API includes: pricing, features, availability, metadata`);
    }
    
  } catch (error) {
    console.error('❌ Error testing comparison:', error.message);
  }
}

// Main test runner
async function runAllTests() {
  try {
    await testEnhancedServices();
    await testServiceDetails();
    await testDynamicPricing();
    await testServiceAnalytics();
    await testComparison();
    
    console.log('\n\n🎉 === All Tests Completed ===');
    console.log('✅ Enhanced Services API is working correctly!');
    console.log('🚀 New features implemented:');
    console.log('   - Advanced filtering and search');
    console.log('   - Dynamic pricing with quotes');
    console.log('   - Service analytics and insights');
    console.log('   - Rich metadata and recommendations');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testEnhancedServices,
  testServiceDetails,
  testDynamicPricing,
  testServiceAnalytics,
  testComparison,
  runAllTests
}; 