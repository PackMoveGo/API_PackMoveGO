const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testAuthSystem() {
    console.log('🧪 Testing PackMoveGO Authentication System\n');
    
    try {
        // Test 1: Check authentication status without login
        console.log('1. Testing authentication status (no login)...');
        const statusResponse = await fetch(`${BASE_URL}/api/auth/status`);
        const statusData = await statusResponse.json();
        console.log('   Status:', statusData);
        console.log('   ✅ Status check completed\n');
        
        // Test 2: Try to access protected resource without login
        console.log('2. Testing protected resource access (no login)...');
        const protectedResponse = await fetch(`${BASE_URL}/api/auth/protected`);
        const protectedData = await protectedResponse.json();
        console.log('   Response:', protectedData);
        console.log('   ✅ Protected resource test completed\n');
        
        // Test 3: Try login with wrong password
        console.log('3. Testing login with wrong password...');
        const wrongLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'wrongpassword' })
        });
        const wrongLoginData = await wrongLoginResponse.json();
        console.log('   Response:', wrongLoginData);
        console.log('   ✅ Wrong password test completed\n');
        
        // Test 4: Try login with correct password
        console.log('4. Testing login with correct password...');
        const correctLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'packmovego2024' })
        });
        const correctLoginData = await correctLoginResponse.json();
        console.log('   Response:', correctLoginData);
        
        if (correctLoginData.success) {
            console.log('   ✅ Login successful!');
            
            // Test 5: Check status after login
            console.log('\n5. Testing authentication status after login...');
            const cookies = correctLoginResponse.headers.get('set-cookie');
            const authToken = cookies ? cookies.split(';')[0].split('=')[1] : null;
            
            const statusAfterLoginResponse = await fetch(`${BASE_URL}/api/auth/status`, {
                headers: { 
                    'Cookie': `authToken=${authToken}`,
                    'Authorization': `Bearer ${correctLoginData.token}`
                }
            });
            const statusAfterLoginData = await statusAfterLoginResponse.json();
            console.log('   Status after login:', statusAfterLoginData);
            console.log('   ✅ Status after login test completed\n');
            
            // Test 6: Access protected resource after login
            console.log('6. Testing protected resource access after login...');
            const protectedAfterLoginResponse = await fetch(`${BASE_URL}/api/auth/protected`, {
                headers: { 
                    'Cookie': `authToken=${authToken}`,
                    'Authorization': `Bearer ${correctLoginData.token}`
                }
            });
            const protectedAfterLoginData = await protectedAfterLoginResponse.json();
            console.log('   Response:', protectedAfterLoginData);
            console.log('   ✅ Protected resource after login test completed\n');
            
            // Test 7: Test logout
            console.log('7. Testing logout...');
            const logoutResponse = await fetch(`${BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: { 
                    'Cookie': `authToken=${authToken}`,
                    'Authorization': `Bearer ${correctLoginData.token}`
                }
            });
            const logoutData = await logoutResponse.json();
            console.log('   Response:', logoutData);
            console.log('   ✅ Logout test completed\n');
            
            // Test 8: Check status after logout
            console.log('8. Testing authentication status after logout...');
            const statusAfterLogoutResponse = await fetch(`${BASE_URL}/api/auth/status`);
            const statusAfterLogoutData = await statusAfterLogoutResponse.json();
            console.log('   Status after logout:', statusAfterLogoutData);
            console.log('   ✅ Status after logout test completed\n');
            
        } else {
            console.log('   ❌ Login failed');
        }
        
        // Test 9: Test health endpoint (should always work)
        console.log('9. Testing health endpoint...');
        const healthResponse = await fetch(`${BASE_URL}/api/health`);
        const healthData = await healthResponse.json();
        console.log('   Health status:', healthData.status);
        console.log('   ✅ Health endpoint test completed\n');
        
        console.log('🎉 All authentication tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testAuthSystem(); 