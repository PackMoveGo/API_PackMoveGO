const http = require('http');
const os = require('os');

class MobileAPIClient {
    constructor(baseURL = 'http://localhost:4000') {
        this.baseURL = baseURL;
        this.networkIPs = this.getNetworkIPs();
    }

    // Get all network interfaces
    getNetworkIPs() {
        const interfaces = os.networkInterfaces();
        const ips = [];
        
        Object.keys(interfaces).forEach((name) => {
            interfaces[name].forEach((interface) => {
                if (interface.family === 'IPv4' && !interface.internal) {
                    ips.push({
                        name: name,
                        address: interface.address,
                        netmask: interface.netmask
                    });
                }
            });
        });
        
        return ips;
    }

    // Make HTTP request
    async makeRequest(path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseURL);
            const requestOptions = {
                hostname: url.hostname,
                port: url.port || 4000,
                path: url.pathname,
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };

            const req = http.request(requestOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: jsonData
                        });
                    } catch (error) {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: data
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (options.body) {
                req.write(JSON.stringify(options.body));
            }

            req.end();
        });
    }

    // Test health endpoint
    async testHealth() {
        try {
            const response = await this.makeRequest('/health');
            return {
                success: true,
                data: response.data,
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Test mobile endpoint
    async testMobile() {
        try {
            const response = await this.makeRequest('/mobile-test');
            return {
                success: true,
                data: response.data,
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get blog data
    async getBlog() {
        try {
            const response = await this.makeRequest('/v0/blog');
            return {
                success: true,
                data: response.data,
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get services data
    async getServices() {
        try {
            const response = await this.makeRequest('/v0/services');
            return {
                success: true,
                data: response.data,
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Test all endpoints
    async testAllEndpoints() {
        console.log('🔍 Testing all Mobile API endpoints...');
        
        const results = {
            health: await this.testHealth(),
            mobile: await this.testMobile(),
            blog: await this.getBlog(),
            services: await this.getServices()
        };

        console.log('📊 Test Results:');
        console.log('================');
        
        Object.keys(results).forEach(endpoint => {
            const result = results[endpoint];
            if (result.success) {
                console.log(`✅ ${endpoint}: ${result.status} - ${result.data.message || 'Success'}`);
            } else {
                console.log(`❌ ${endpoint}: ${result.error}`);
            }
        });

        return results;
    }

    // Test connectivity from all network interfaces
    async testAllNetworkInterfaces() {
        console.log('🌐 Testing connectivity from all network interfaces...');
        
        const results = [];
        
        for (const ip of this.networkIPs) {
            console.log(`\n📡 Testing ${ip.name} (${ip.address})...`);
            
            const client = new MobileAPIClient(`http://${ip.address}:4000`);
            const healthResult = await client.testHealth();
            
            results.push({
                interface: ip.name,
                address: ip.address,
                health: healthResult
            });
            
            if (healthResult.success) {
                console.log(`✅ ${ip.address}:4000 - Working`);
            } else {
                console.log(`❌ ${ip.address}:4000 - ${healthResult.error}`);
            }
        }
        
        return results;
    }

    // Generate test URLs for phone
    generatePhoneURLs() {
        console.log('\n📱 Phone Test URLs:');
        console.log('===================');
        
        this.networkIPs.forEach(ip => {
            console.log(`\n🌐 ${ip.name} (${ip.address}):`);
            console.log(`• Health: http://${ip.address}:4000/health`);
            console.log(`• Mobile Test: http://${ip.address}:4000/mobile-test`);
            console.log(`• Blog: http://${ip.address}:4000/v0/blog`);
            console.log(`• Services: http://${ip.address}:4000/v0/services`);
            console.log(`• Phone Test Page: http://${ip.address}:5001`);
        });
    }
}

// Main execution
async function main() {
    console.log('🚀 === MOBILE API CLIENT ===');
    
    const client = new MobileAPIClient();
    
    // Test all endpoints
    await client.testAllEndpoints();
    
    // Test all network interfaces
    await client.testAllNetworkInterfaces();
    
    // Generate phone URLs
    client.generatePhoneURLs();
    
    console.log('\n✅ Mobile API client testing complete!');
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = MobileAPIClient; 