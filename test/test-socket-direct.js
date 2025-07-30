const io = require('socket.io-client');

console.log('🧪 Testing direct Socket.IO connection...\n');

// Try connecting without authentication first
const client = io('http://localhost:3000', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  }
});

client.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  console.log('🆔 Socket ID:', client.id);
  console.log('📱 Device: Mobile (iPhone)');
  console.log('⏰ Connected at:', new Date().toLocaleString());
  console.log('');
  
  // Disconnect after 3 seconds
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    client.disconnect();
  }, 3000);
});

client.on('disconnect', () => {
  console.log('✅ Disconnected from server');
  process.exit(0);
});

client.on('connect_error', (error) => {
  console.log('❌ Connection error:', error.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Connection timeout');
  process.exit(1);
}, 10000); 