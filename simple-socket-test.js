const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Generate a test JWT token
const testToken = jwt.sign(
  {
    userId: 'user1',
    email: 'user1@packmovego.com',
    role: 'user'
  },
  'a131fba4ee1366460f9b1da9ae09e620076459338f7248af25eb09c3b9a613fc33e2b8b9a2b931246f74c6e7f7844a66214363d625e65cd138aa92e5d4691ce0',
  { 
    expiresIn: '1h',
    issuer: 'packmovego-api',
    audience: 'packmovego-frontend'
  }
);

console.log('🧪 Testing enhanced Socket.IO logging...\n');

// Create a mobile user connection
const mobileClient = io('http://localhost:3000', {
  auth: { token: testToken },
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  }
});

mobileClient.on('connect', () => {
  console.log('✅ Mobile user connected to server');
  console.log('📱 User: user1@packmovego.com');
  console.log('📱 Device: iPhone (Mobile)');
  console.log('🌐 IP: Local connection');
  console.log('🆔 Socket ID:', mobileClient.id);
  console.log('⏰ Connected at:', new Date().toLocaleString());
  console.log('');
  
  // Join a room
  mobileClient.emit('join-room', 'test-room');
  
  // Send a message
  setTimeout(() => {
    mobileClient.emit('send-message', {
      room: 'test-room',
      message: 'Hello from user1 on mobile device!',
      type: 'text'
    });
  }, 1000);
  
  // Disconnect after 5 seconds
  setTimeout(() => {
    console.log('🔌 Disconnecting mobile user...');
    mobileClient.disconnect();
  }, 5000);
});

mobileClient.on('disconnect', () => {
  console.log('✅ Mobile user disconnected');
  console.log('⏱️  Connection duration: ~5 seconds');
  console.log('');
  process.exit(0);
}); 