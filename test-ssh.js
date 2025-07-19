const { Client } = require('ssh2');

const SSH_CONFIG = {
  host: 'localhost',
  port: 2222,
  username: 'admin',
  password: 'packmovego2024'
};

async function testSSHConnection() {
  console.log('🔐 Testing PackMoveGO SSH Connection\n');
  
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('✅ SSH connection established successfully!');
    
    // Test shell access
    conn.shell((err, stream) => {
      if (err) {
        console.error('❌ Error creating shell:', err.message);
        conn.end();
        return;
      }
      
      console.log('🐚 Shell created successfully');
      
      let output = '';
      
      stream.on('data', (data) => {
        output += data.toString();
        console.log('📤 Received:', data.toString().trim());
      });
      
      stream.on('close', () => {
        console.log('🔚 Shell closed');
        conn.end();
      });
      
      // Send a test command
      setTimeout(() => {
        console.log('📤 Sending test command: whoami');
        stream.write('whoami\n');
      }, 1000);
      
      // Close after 5 seconds
      setTimeout(() => {
        console.log('🔚 Closing connection after test');
        stream.end();
      }, 5000);
    });
  });
  
  conn.on('error', (err) => {
    console.error('❌ SSH connection error:', err.message);
  });
  
  conn.on('close', () => {
    console.log('🔚 SSH connection closed');
  });
  
  try {
    console.log(`🔗 Connecting to ${SSH_CONFIG.host}:${SSH_CONFIG.port}...`);
    conn.connect(SSH_CONFIG);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

// Test SSH server status via API
async function testSSHAPI() {
  console.log('\n🌐 Testing SSH API endpoints...\n');
  
  try {
    // Test SSH config endpoint
    console.log('1. Testing SSH config endpoint...');
    const configResponse = await fetch('http://localhost:3000/api/ssh/config', {
      headers: {
        'X-Forwarded-For': '172.58.117.103',
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('   ✅ SSH config:', configData);
    } else {
      console.log('   ❌ SSH config failed:', configResponse.status);
    }
    
    // Test SSH status endpoint
    console.log('\n2. Testing SSH status endpoint...');
    const statusResponse = await fetch('http://localhost:3000/api/ssh/status', {
      headers: {
        'X-Forwarded-For': '172.58.117.103',
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('   ✅ SSH status:', statusData);
    } else {
      console.log('   ❌ SSH status failed:', statusResponse.status);
    }
    
    // Test SSH instructions endpoint
    console.log('\n3. Testing SSH instructions endpoint...');
    const instructionsResponse = await fetch('http://localhost:3000/api/ssh/instructions', {
      headers: {
        'X-Forwarded-For': '172.58.117.103',
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (instructionsResponse.ok) {
      const instructionsData = await instructionsResponse.json();
      console.log('   ✅ SSH instructions:', instructionsData);
    } else {
      console.log('   ❌ SSH instructions failed:', instructionsResponse.status);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Starting SSH Tests\n');
  
  // Test API endpoints first
  await testSSHAPI();
  
  // Test SSH connection
  await testSSHConnection();
  
  console.log('\n🎉 SSH tests completed!');
}

// Check if SSH server is running
async function checkSSHServer() {
  const net = require('net');
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log('✅ SSH server is running on port 2222');
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log('❌ SSH server is not running on port 2222');
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      console.log('❌ SSH server is not running on port 2222');
      resolve(false);
    });
    
    socket.connect(2222, 'localhost');
  });
}

// Main execution
async function main() {
  const sshRunning = await checkSSHServer();
  
  if (!sshRunning) {
    console.log('\n⚠️  SSH server is not running. Please start the server first:');
    console.log('   npm run dev');
    return;
  }
  
  await runTests();
}

main().catch(console.error); 