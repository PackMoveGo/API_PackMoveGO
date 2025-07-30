import { Server } from 'ssh2';
import { spawn } from 'child_process';
import { createServer } from 'net';
import fs from 'fs';
import path from 'path';

// Simple SSH configuration
const SSH_CONFIG = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  SSH_PORT: parseInt(process.env.SSH_PORT || '2222', 10),
  SSH_PASSWORD: process.env.SSH_PASSWORD || 'defaultpassword',
  SESSION_TIMEOUT: 10 * 60 * 1000, // 10 minutes
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'defaultadmin',
  RENDER_ENV: process.env.RENDER || false,
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || 'localhost'
};

interface SSHUser {
  username: string;
  password: string;
  ip: string;
  authenticated: boolean;
  lastActivity: number;
}

// SSH Configuration
const SSH_CONFIG = {
  PORT: parseInt(process.env.SSH_PORT || '2222'),
  HOST: process.env.SSH_HOST || '0.0.0.0',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes for Render
  MAX_CONNECTIONS: 3, // Limit for Render

  
  ADMIN_PASSWORD: AUTH_CONFIG.ADMIN_PASSWORD,
  LOG_DIR: process.env.LOG_DIR || './logs',
  RENDER_ENV: process.env.RENDER || false
};

// Active SSH sessions
const activeSessions = new Map<string, SSHUser>();

// Get client IP from connection
function getClientIp(conn: any): string {
  return conn.remoteAddress || 'unknown';
}

// Check if IP is allowed for SSH access
function isAllowedForSSH(ip: string): boolean {
  // Always allow SSH access in public API
  return true;
}

// Clean up expired sessions
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, user] of activeSessions.entries()) {
    if (now - user.lastActivity > SSH_CONFIG.SESSION_TIMEOUT) {
      activeSessions.delete(sessionId);
      console.log(`🔒 SSH session expired for user: ${user.username} from IP: ${user.ip}`);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredSessions, 60000);

// Function to get SSH host key
function getSSHHostKey(): Buffer {
  // First try environment variable
  if (process.env.SSH_HOST_KEY) {
    return Buffer.from(process.env.SSH_HOST_KEY);
  }
  
  // Then try key file
  const keyPath = process.env.SSH_HOST_KEY_PATH || './src/test/test_ssh_key';
  try {
    return require('fs').readFileSync(keyPath);
  } catch (error) {
    console.log('⚠️ SSH key file not found, using default key');
    // Generate a simple key for development
    return Buffer.from('ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7eNtGpNGwstc....');
  }
}

// Create SSH server
const sshServer = new Server({
  hostKeys: [{
    key: getSSHHostKey(),
    passphrase: process.env.SSH_HOST_KEY_PASSPHRASE || ''
  }]
}, (client) => {
  const clientIp = getClientIp(client);
  console.log(`🔐 SSH connection attempt from IP: ${clientIp}`);

  // Check if IP is allowed
  if (!isAllowedForSSH(clientIp)) {
    console.log(`🚫 SSH access denied for IP: ${clientIp}`);
    client.end();
    return;
  }

  client.on('authentication', (ctx) => {
    const username = ctx.username;
    const method = ctx.method;
    
    console.log(`🔐 SSH auth attempt: ${username} using ${method} from IP: ${clientIp}`);

    if (method === 'password') {
      const password = ctx.password;
      
      // Check password
      if (password === SSH_CONFIG.ADMIN_PASSWORD) {
        console.log(`✅ SSH access granted to IP: ${clientIp}`);
        ctx.accept();
        
        // Create session
        const sessionId = `${clientIp}-${Date.now()}`;
        activeSessions.set(sessionId, {
          username,
          password,
          ip: clientIp,
          authenticated: true,
          lastActivity: Date.now()
        });
        
        return;
      }
      
      console.log(`❌ SSH authentication failed for IP: ${clientIp}`);
      ctx.reject(['password'], false);
    } else {
      console.log(`❌ Unsupported SSH auth method: ${method}`);
      ctx.reject(['password'], false);
    }
  });

  client.on('ready', () => {
    console.log(`✅ SSH client ready from IP: ${clientIp}`);
    
    client.on('session', (accept, reject) => {
      const session = accept();
      
      session.on('pty', (accept, reject, info) => {
        console.log(`🖥️ PTY requested from IP: ${clientIp}`);
        accept();
      });
      
      session.on('shell', (accept, reject) => {
        console.log(`🐚 Shell requested from IP: ${clientIp}`);
        
        const stream = accept();
        const shell = spawn('/bin/bash', [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            SSH_CLIENT: clientIp,
            SSH_USER: 'admin',
            TERM: 'xterm-256color'
          }
        });
        
        // Update session activity
        const sessionId = Array.from(activeSessions.keys()).find(key => 
          activeSessions.get(key)?.ip === clientIp
        );
        if (sessionId) {
          const session = activeSessions.get(sessionId);
          if (session) {
            session.lastActivity = Date.now();
          }
        }
        
        // Pipe data between SSH client and shell
        shell.stdout.pipe(stream);
        shell.stderr.pipe(stream);
        stream.pipe(shell.stdin);
        
        // Handle shell exit
        shell.on('exit', (code) => {
          console.log(`🔚 SSH shell exited with code ${code} for IP: ${clientIp}`);
          stream.end();
        });
        
        // Handle stream end
        stream.on('close', () => {
          console.log(`🔚 SSH stream closed for IP: ${clientIp}`);
          shell.kill();
        });
        
        // Send welcome message with Render-specific info
        const welcomeMessage = `
╔══════════════════════════════════════════════════════════════╗
║                    PackMoveGO Render SSH                     ║
╠══════════════════════════════════════════════════════════════╣
║  Welcome to PackMoveGO Server Terminal                      ║
║  Environment: ${SSH_CONFIG.RENDER_ENV ? 'Render' : 'Development'}${SSH_CONFIG.RENDER_ENV ? ' (Production)' : ''}
║  IP Address: ${clientIp.padEnd(47)} ║
║  Session Timeout: ${SSH_CONFIG.SESSION_TIMEOUT / 60000} minutes                           ║
║  Type 'help' for available commands                        ║
╚══════════════════════════════════════════════════════════════╝

📋 Available Commands:
   logs          - View server logs
   status        - Show server status
   restart       - Restart the server
   memory        - Show memory usage
   processes     - Show running processes
   help          - Show this help message
   exit          - Disconnect from SSH

$ `;
        stream.write(welcomeMessage);
        
        // Set up command handling
        let commandBuffer = '';
        stream.on('data', (data: Buffer) => {
          const input = data.toString();
          commandBuffer += input;
          
          if (input.includes('\n') || input.includes('\r')) {
            const command = commandBuffer.trim();
            commandBuffer = '';
            
            if (command === 'logs') {
              stream.write('\n📋 Server Logs:\n');
              stream.write('=====================================\n');
              // Show recent logs
              stream.write('Recent server activity will be displayed here...\n');
              stream.write('$ ');
            } else if (command === 'status') {
              stream.write('\n📊 Server Status:\n');
              stream.write('=====================================\n');
              stream.write(`Uptime: ${Math.floor(process.uptime())} seconds\n`);
              stream.write(`Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n`);
              stream.write(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
              stream.write(`Active SSH Sessions: ${activeSessions.size}\n`);
              stream.write('$ ');
            } else if (command === 'restart') {
              stream.write('\n🔄 Restarting server...\n');
              stream.write('This will restart the PackMoveGO server.\n');
              stream.write('$ ');
            } else if (command === 'memory') {
              const mem = process.memoryUsage();
              stream.write('\n💾 Memory Usage:\n');
              stream.write('=====================================\n');
              stream.write(`RSS: ${Math.round(mem.rss / 1024 / 1024)}MB\n`);
              stream.write(`Heap Total: ${Math.round(mem.heapTotal / 1024 / 1024)}MB\n`);
              stream.write(`Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)}MB\n`);
              stream.write(`External: ${Math.round(mem.external / 1024 / 1024)}MB\n`);
              stream.write('$ ');
            } else if (command === 'processes') {
              stream.write('\n🔄 Running Processes:\n');
              stream.write('=====================================\n');
              stream.write('Node.js processes and system information...\n');
              stream.write('$ ');
            } else if (command === 'help') {
              stream.write('\n📋 Available Commands:\n');
              stream.write('=====================================\n');
              stream.write('logs          - View server logs\n');
              stream.write('status        - Show server status\n');
              stream.write('restart       - Restart the server\n');
              stream.write('memory        - Show memory usage\n');
              stream.write('processes     - Show running processes\n');
              stream.write('help          - Show this help message\n');
              stream.write('exit          - Disconnect from SSH\n');
              stream.write('$ ');
            } else if (command === 'exit' || command === 'logout') {
              stream.write('\n👋 Goodbye!\n');
              stream.end();
            } else if (command && command !== '') {
              // Pass through to shell
              shell.stdin.write(data);
            }
          }
        });
      });
    });
    
    client.on('error', (err) => {
      console.error(`❌ SSH client error from IP: ${clientIp}:`, err.message);
    });
    
    client.on('close', () => {
      console.log(`🔚 SSH client disconnected from IP: ${clientIp}`);
      
      // Clean up session
      const sessionId = Array.from(activeSessions.keys()).find(key => 
        activeSessions.get(key)?.ip === clientIp
      );
      if (sessionId) {
        activeSessions.delete(sessionId);
      }
    });
  });
  
  client.on('error', (err) => {
    console.error(`❌ SSH connection error from IP: ${clientIp}:`, err.message);
  });
});

// Create TCP server to listen for SSH connections
const tcpServer = createServer((socket) => {
  sshServer.emit('connection', socket);
});

// Function to start SSH server
function startSSHServer() {
  // Check if SSH should be enabled
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_SSH) {
    console.log('🔐 SSH Server disabled in production (ENABLE_SSH not set)');
    return;
  }

  // Check if key file exists
  const keyPath = process.env.SSH_HOST_KEY_PATH || './src/test/test_ssh_key';
  try {
    require('fs').accessSync(keyPath);
  } catch (error) {
    console.log('🔐 SSH Server disabled - key file missing');
    return;
  }

  tcpServer.listen(SSH_CONFIG.PORT, SSH_CONFIG.HOST, () => {
    console.log(`🔐 SSH Server started on ${SSH_CONFIG.HOST}:${SSH_CONFIG.PORT}`);
    console.log(`📋 SSH Configuration:`);
    console.log(`   - Environment: ${SSH_CONFIG.RENDER_ENV ? 'Render (Production)' : 'Development'}`);
    console.log(`   - Max Connections: ${SSH_CONFIG.MAX_CONNECTIONS}`);
    console.log(`   - Session Timeout: ${SSH_CONFIG.SESSION_TIMEOUT / 60000} minutes`);
    console.log(`   - Render Mode: ${SSH_CONFIG.RENDER_ENV ? 'Enabled' : 'Disabled'}`);
  });

  // Handle server errors
  tcpServer.on('error', (err) => {
    console.error('❌ SSH Server error:', err.message);
  });
}

// Don't start SSH server automatically - it will be started explicitly if needed
// setTimeout(() => {
//   try {
//     startSSHServer();
//   } catch (error) {
//     console.error('❌ Failed to start SSH server:', error);
//   }
// }, 2000);

export { sshServer, activeSessions, SSH_CONFIG, startSSHServer }; 