import express from 'express';
// Conditional SSH imports to avoid initialization issues
let activeSessions: Map<string, any>;
let SSH_CONFIG: any;

try {
  const sshModule = require('../ssh/sshServer');
  activeSessions = sshModule.activeSessions;
  SSH_CONFIG = sshModule.SSH_CONFIG;
} catch (error) {
  console.log('⚠️ SSH module not available');
  activeSessions = new Map();
  SSH_CONFIG = {
    PORT: 2222,
    HOST: '0.0.0.0',
    MAX_CONNECTIONS: 5,
    SESSION_TIMEOUT: 3600000,
  
    FRONTEND_IP: '',
    ADMIN_PASSWORD: ''
  };
}

import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

// Get SSH server status
router.get('/status', requireAuth, (req, res) => {
  const activeConnections = activeSessions.size;
  const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
    id,
    username: session.username,
    ip: session.ip,
    lastActivity: session.lastActivity,
    timeRemaining: Math.max(0, SSH_CONFIG.SESSION_TIMEOUT - (Date.now() - session.lastActivity))
  }));

  res.json({
    success: true,
    ssh: {
      enabled: true,
      port: SSH_CONFIG.PORT,
      host: SSH_CONFIG.HOST,
      maxConnections: SSH_CONFIG.MAX_CONNECTIONS,
      sessionTimeout: SSH_CONFIG.SESSION_TIMEOUT,
      activeConnections,
      sessions
    }
  });
});

// Get SSH configuration
router.get('/config', requireAuth, (req, res) => {
  res.json({
    success: true,
    config: {
      port: SSH_CONFIG.PORT,
      host: SSH_CONFIG.HOST,
      frontendIP: SSH_CONFIG.FRONTEND_IP,
      sessionTimeout: SSH_CONFIG.SESSION_TIMEOUT,
      maxConnections: SSH_CONFIG.MAX_CONNECTIONS
    }
  });
});

// Disconnect a specific SSH session
router.post('/disconnect/:sessionId', requireAuth, (req, res) => {
  const { sessionId } = req.params;
  
  if (activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId);
    activeSessions.delete(sessionId);
    
    res.json({
      success: true,
      message: `SSH session ${sessionId} disconnected`,
      session: {
        id: sessionId,
        username: session?.username,
        ip: session?.ip
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }
});

// Disconnect all SSH sessions
router.post('/disconnect-all', requireAuth, (req, res) => {
  const disconnectedCount = activeSessions.size;
  const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
    id,
    username: session.username,
    ip: session.ip
  }));
  
  activeSessions.clear();
  
  res.json({
    success: true,
    message: `Disconnected ${disconnectedCount} SSH sessions`,
    disconnectedSessions: sessions
  });
});

// Get SSH connection instructions
router.get('/instructions', requireAuth, (req, res) => {
  res.json({
    success: true,
    instructions: {
      connection: `ssh -p ${SSH_CONFIG.PORT} admin@${SSH_CONFIG.HOST}`,
      password: SSH_CONFIG.ADMIN_PASSWORD,
      sessionTimeout: `${SSH_CONFIG.SESSION_TIMEOUT / 1000} seconds`,
      commands: [
        'help - Show available commands',
        'status - Show server status',
        'logs - View server logs',
        'restart - Restart the server',
        'exit - Disconnect from SSH'
      ]
    }
  });
});

export default router; 