const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Generate a test JWT token
const testToken = jwt.sign(
  {
    userId: 'test-user-1',
    email: 'user1@packmovego.com',
    role: 'user'
  },
  'fallback_secret',
  { expiresIn: '1h' }
);

const adminToken = jwt.sign(
  {
    userId: 'admin-user-1',
    email: 'admin@packmovego.com',
    role: 'admin'
  },
  'fallback_secret',
  { expiresIn: '1h' }
);

console.log('🧪 Testing Socket.IO connections with enhanced logging...\n');

// Test 1: Regular user connection
console.log('📱 Test 1: Mobile user connection');
const mobileClient = io('http://localhost:3000', {
  auth: { token: testToken },
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  }
});

mobileClient.on('connect', () => {
  console.log('✅ Mobile client connected');
  
  // Join a room
  mobileClient.emit('join-room', 'test-room-1');
  
  // Send a message
  setTimeout(() => {
    mobileClient.emit('send-message', {
      room: 'test-room-1',
      message: 'Hello from mobile user!',
      type: 'text'
    });
  }, 1000);
  
  // Disconnect after 3 seconds
  setTimeout(() => {
    mobileClient.disconnect();
  }, 3000);
});

// Test 2: Desktop user connection
setTimeout(() => {
  console.log('\n💻 Test 2: Desktop user connection');
  const desktopClient = io('http://localhost:3000', {
    auth: { token: testToken },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  desktopClient.on('connect', () => {
    console.log('✅ Desktop client connected');
    
    // Join a room
    desktopClient.emit('join-room', 'test-room-1');
    
    // Send a message
    setTimeout(() => {
      desktopClient.emit('send-message', {
        room: 'test-room-1',
        message: 'Hello from desktop user! This is a longer message to test the logging.',
        type: 'text'
      });
    }, 1000);
    
    // Disconnect after 3 seconds
    setTimeout(() => {
      desktopClient.disconnect();
    }, 3000);
  });
}, 4000);

// Test 3: Admin user connection
setTimeout(() => {
  console.log('\n👑 Test 3: Admin user connection');
  const adminClient = io('http://localhost:3000', {
    auth: { token: adminToken },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  adminClient.on('connect', () => {
    console.log('✅ Admin client connected');
    
    // Join admin room
    adminClient.emit('join-room', 'admin');
    
    // Send admin message
    setTimeout(() => {
      adminClient.emit('send-message', {
        room: 'admin',
        message: 'Admin notification: System status check',
        type: 'admin'
      });
    }, 1000);
    
    // Disconnect after 3 seconds
    setTimeout(() => {
      adminClient.disconnect();
    }, 3000);
  });
}, 8000);

// Test 4: API client connection
setTimeout(() => {
  console.log('\n🔧 Test 4: API client connection');
  const apiClient = io('http://localhost:3000', {
    auth: { token: testToken },
    headers: {
      'User-Agent': 'PostmanRuntime/7.28.0'
    }
  });

  apiClient.on('connect', () => {
    console.log('✅ API client connected');
    
    // Disconnect after 2 seconds
    setTimeout(() => {
      apiClient.disconnect();
    }, 2000);
  });
}, 12000);

// Cleanup after all tests
setTimeout(() => {
  console.log('\n🧹 All tests completed. Check server logs for enhanced connection details.');
  process.exit(0);
}, 15000); 