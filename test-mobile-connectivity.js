#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

console.log('📱 Mobile Connectivity Test for PackMoveGO API');
console.log('==============================================\n');

// Test endpoints
const endpoints = [
    {
        name: 'Production Health',
        url: 'https://api.packmovego.com/api/health',
        description: 'Basic health check'
    },
    {
        name: 'Mobile Health',
        url: 'https://api.packmovego.com/mobile/health',
        description: 'Mobile-specific health check'
    },
    {
        name: 'Simple Health',
        url: 'https://api.packmovego.com/health',
        description: 'Simple health endpoint'
    },
    {
        name: 'Blog Data',
        url: 'https://api.packmovego.com/v0/blog',
        description: 'Blog content data'
    },
    {
        name: 'Services Data',
        url: 'https://api.packmovego.com/v0/services',
        description: 'Services data'
    },
    {
        name: 'About Data',
        url: 'https://api.packmovego.com/v0/about',
        description: 'About page data'
    },
    {
        name: 'Contact Data',
        url: 'https://api.packmovego.com/v0/contact',
        description: 'Contact information'
    },
    {
        name: 'Locations Data',
        url: 'https://api.packmovego.com/v0/locations',
        description: 'Locations data'
    },
    {
        name: 'Reviews Data',
        url: 'https://api.packmovego.com/v0/reviews',
        description: 'Reviews data'
    },
    {
        name: 'Supplies Data',
        url: 'https://api.packmovego.com/v0/supplies',
        description: 'Supplies data'
    },
    {
        name: 'Testimonials Data',
        url: 'https://api.packmovego.com/v0/testimonials',
        description: 'Testimonials data'
    },
    {
        name: 'Navigation Data',
        url: 'https://api.packmovego.com/v0/nav',
        description: 'Navigation data'
    },
    {
        name: 'Referral Data',
        url: 'https://api.packmovego.com/v0/referral',
        description: 'Referral data'
    }
];

// Test CORS headers
const corsEndpoints = [
    {
        name: 'CORS Preflight Test',
        url: 'https://api.packmovego.com/api/health',
        method: 'OPTIONS',
        headers: {
            'Origin': 'https://www.packmovego.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
        }
    }
];

async function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        const url = new URL(endpoint.url);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: endpoint.method || 'GET',
            headers: {
                'User-Agent': 'PackMoveGo-Client/1.0',
                'Content-Type': 'application/json',
                ...endpoint.headers
            },
            timeout: 10000 // 10 second timeout
        };

        const client = url.protocol === 'https:' ? https : http;
        
        const req = client.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const result = {
                    name: endpoint.name,
                    url: endpoint.url,
                    status: res.statusCode,
                    headers: res.headers,
                    data: data,
                    success: res.statusCode >= 200 && res.statusCode < 300
                };
                
                resolve(result);
            });
        });
        
        req.on('error', (error) => {
            resolve({
                name: endpoint.name,
                url: endpoint.url,
                error: error.message,
                success: false
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                name: endpoint.name,
                url: endpoint.url,
                error: 'Request timeout',
                success: false
            });
        });
        
        req.end();
    });
}

async function runTests() {
    console.log('🚀 Testing Production API Endpoints...\n');
    
    let successCount = 0;
    let totalCount = endpoints.length;
    
    for (const endpoint of endpoints) {
        process.stdout.write(`Testing ${endpoint.name}... `);
        
        const result = await testEndpoint(endpoint);
        
        if (result.success) {
            console.log('✅ SUCCESS');
            successCount++;
            
            // Show response details for successful requests
            try {
                const jsonData = JSON.parse(result.data);
                console.log(`   Status: ${result.status}`);
                console.log(`   Response: ${JSON.stringify(jsonData, null, 2).substring(0, 200)}...`);
            } catch (e) {
                console.log(`   Status: ${result.status}`);
                console.log(`   Response: ${result.data.substring(0, 200)}...`);
            }
        } else {
            console.log('❌ FAILED');
            console.log(`   Error: ${result.error || 'Unknown error'}`);
        }
        
        console.log('');
    }
    
    console.log('🔍 Testing CORS Configuration...\n');
    
    for (const endpoint of corsEndpoints) {
        process.stdout.write(`Testing ${endpoint.name}... `);
        
        const result = await testEndpoint(endpoint);
        
        if (result.success) {
            console.log('✅ SUCCESS');
            console.log(`   Status: ${result.status}`);
            
            // Check for CORS headers
            const corsHeaders = {
                'Access-Control-Allow-Origin': result.headers['access-control-allow-origin'],
                'Access-Control-Allow-Methods': result.headers['access-control-allow-methods'],
                'Access-Control-Allow-Headers': result.headers['access-control-allow-headers']
            };
            
            console.log(`   CORS Headers: ${JSON.stringify(corsHeaders, null, 2)}`);
        } else {
            console.log('❌ FAILED');
            console.log(`   Error: ${result.error || 'Unknown error'}`);
        }
        
        console.log('');
    }
    
    // Summary
    console.log('📊 Test Summary');
    console.log('===============');
    console.log(`✅ Successful: ${successCount}/${totalCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
    console.log(`📈 Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    if (successCount === totalCount) {
        console.log('\n🎉 All tests passed! Your API is working correctly.');
        console.log('📱 Your phone should be able to connect to the API.');
    } else {
        console.log('\n⚠️ Some tests failed. Check the errors above.');
        console.log('🔧 This might indicate connectivity or configuration issues.');
    }
    
    // Mobile testing instructions
    console.log('\n📱 Mobile Testing Instructions:');
    console.log('==============================');
    console.log('1. Open your phone\'s browser');
    console.log('2. Navigate to: https://api.packmovego.com/mobile/health');
    console.log('3. You should see a JSON response');
    console.log('4. If it works, your phone can access the API');
    console.log('5. If it fails, check your phone\'s network connection');
    
    console.log('\n🔧 Troubleshooting:');
    console.log('==================');
    console.log('- Make sure your phone has internet access');
    console.log('- Try different browsers (Safari, Chrome, Firefox)');
    console.log('- Check if your phone\'s firewall is blocking the connection');
    console.log('- Try turning off mobile data and using WiFi only');
    console.log('- Some corporate networks block certain domains');
}

// Run the tests
runTests().catch(console.error); 