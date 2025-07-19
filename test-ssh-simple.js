const { Server } = require('ssh2');
const { spawn } = require('child_process');
const { createServer } = require('net');

console.log('🧪 Testing SSH Server Setup\n');

// Simple SSH server test
const sshServer = new Server({
  hostKeys: [{
    key: require('fs').readFileSync('./test_ssh_key'),
    passphrase: ''
  }]
}, (client) => {
  console.log('✅ SSH client connected');
  
  client.on('authentication', (ctx) => {
    console.log(`🔐 Auth attempt: ${ctx.username} using ${ctx.method}`);
    
    if (ctx.method === 'password' && ctx.password === 'packmovego2024') {
      console.log('✅ Authentication successful');
      ctx.accept();
    } else {
      console.log('❌ Authentication failed');
      ctx.reject(['password'], false);
    }
  });
  
  client.on('ready', () => {
    console.log('✅ SSH client ready');
    client.end();
  });
  
  client.on('error', (err) => {
    console.error('❌ SSH client error:', err.message);
  });
});

const tcpServer = createServer((socket) => {
  sshServer.emit('connection', socket);
});

tcpServer.listen(2222, '0.0.0.0', () => {
  console.log('🔐 SSH test server started on port 2222');
  console.log('✅ SSH server setup is working correctly');
  
  // Stop after 5 seconds
  setTimeout(() => {
    console.log('🔚 Stopping test server');
    tcpServer.close();
    process.exit(0);
  }, 5000);
});

tcpServer.on('error', (err) => {
  console.error('❌ SSH server error:', err.message);
  process.exit(1);
}); 