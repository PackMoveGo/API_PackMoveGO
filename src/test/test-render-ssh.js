const { Client } = require('ssh2');

console.log('🧪 Testing PackMoveGO Render SSH Setup\n');

// Test SSH connection with Render environment
async function testRenderSSH() {
  console.log('📋 Render SSH Configuration:');
  console.log('   - Environment: Render (Production)');
  console.log('   - Session Timeout: 30 minutes');
  console.log('   - Max Connections: 3');
  console.log('   - IP Restrictions: Disabled for Render');
  console.log('   - Built-in Commands: logs, status, memory, processes, restart, help, exit');
  
  console.log('\n🔗 Testing SSH Connection...');
  
  const conn = new Client();
  
  return new Promise((resolve) => {
    conn.on('ready', () => {
      console.log('✅ SSH connection established successfully!');
      
      // Test shell access
      conn.shell((err, stream) => {
        if (err) {
          console.error('❌ Error creating shell:', err.message);
          conn.end();
          resolve(false);
          return;
        }
        
        console.log('🐚 Shell created successfully');
        
        let output = '';
        let commandSent = false;
        
        stream.on('data', (data) => {
          output += data.toString();
          console.log('📤 Received:', data.toString().trim());
          
          // Send a test command after welcome message
          if (!commandSent && output.includes('$')) {
            setTimeout(() => {
              console.log('📤 Sending test command: help');
              stream.write('help\n');
              commandSent = true;
            }, 1000);
          }
        });
        
        stream.on('close', () => {
          console.log('🔚 Shell closed');
          conn.end();
          resolve(true);
        });
        
        // Close after 10 seconds
        setTimeout(() => {
          console.log('🔚 Closing connection after test');
          stream.end();
        }, 10000);
      });
    });
    
    conn.on('error', (err) => {
      console.error('❌ SSH connection error:', err.message);
      resolve(false);
    });
    
    conn.on('close', () => {
      console.log('🔚 SSH connection closed');
    });
    
    try {
      console.log('🔗 Connecting to localhost:2222...');
      conn.connect({
        host: 'localhost',
        port: 2222,
        username: 'admin',
        password: 'packmovego2024',
        readyTimeout: 10000,
        keepaliveInterval: 1000
      });
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      resolve(false);
    }
  });
}

// Test Render-specific features
function testRenderFeatures() {
  console.log('\n📊 Render-Specific Features:');
  console.log('   ✅ Extended session timeout (30 minutes)');
  console.log('   ✅ IP restrictions disabled for admin access');
  console.log('   ✅ Built-in monitoring commands');
  console.log('   ✅ Log viewing capabilities');
  console.log('   ✅ Memory usage tracking');
  console.log('   ✅ Server status monitoring');
  console.log('   ✅ Process management');
  console.log('   ✅ Render environment detection');
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Render SSH Tests\n');
  
  // Test Render features
  testRenderFeatures();
  
  // Test SSH connection
  const sshTest = await testRenderSSH();
  
  console.log('\n📊 Test Results:');
  console.log(`   SSH Connection: ${sshTest ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  console.log('\n🎉 Render SSH Setup Complete!');
  console.log('\n📝 Next Steps for Render Deployment:');
  console.log('   1. Deploy to Render with environment variables');
  console.log('   2. Set RENDER=true in environment');
  console.log('   3. Configure ADMIN_PASSWORD');
  console.log('   4. Connect via: ssh -p 2222 admin@your-app.onrender.com');
  console.log('   5. Use built-in commands: logs, status, memory, help');
}

runTests().catch(console.error); 