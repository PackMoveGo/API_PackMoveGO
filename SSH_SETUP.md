# PackMoveGO SSH Access

## Overview

This document describes the SSH access functionality added to the PackMoveGO server. Users can now connect via SSH to access the server terminal with IP-based authentication and password protection.

## Features

### 🔐 SSH Authentication
- **IP-Based Access**: Only allowed IPs can connect
- **Password Protection**: Admin password required for access
- **Session Management**: 10-minute session timeout
- **Frontend IP**: Direct access without additional restrictions

### 🖥️ Terminal Access
- **Full Shell Access**: Complete bash terminal
- **Command History**: Standard shell functionality
- **Environment Variables**: SSH_CLIENT and SSH_USER set
- **Welcome Message**: Custom PackMoveGO branding

### 📊 Monitoring & Management
- **Active Sessions**: Track connected users
- **Session Cleanup**: Automatic cleanup of expired sessions
- **API Endpoints**: Monitor and manage SSH via REST API
- **Dashboard Integration**: SSH status in admin dashboard

## Configuration

### Environment Variables

Add these to your `config/.env` file:

```env
# SSH Configuration
SSH_PORT=2222
SSH_HOST=0.0.0.0
SSH_HOST_KEY=your_ssh_host_key_here
SSH_HOST_KEY_PASSPHRASE=your_passphrase_here

# SSH uses the same authentication as web
ADMIN_PASSWORD=packmovego2024
ALLOWED_IPS=76.76.21.21,172.58.117.103,172.58.115.96
```

### SSH Host Key Generation

For production, generate a proper SSH host key:

```bash
# Generate SSH host key
ssh-keygen -t rsa -b 4096 -f ssh_host_key -N ""

# Add to environment
SSH_HOST_KEY=$(cat ssh_host_key)
SSH_HOST_KEY_PASSPHRASE=your_secure_passphrase
```

## Connection Instructions

### Basic Connection

```bash
ssh -p 2222 admin@your-server-ip
```

### Connection Parameters
- **Username**: `admin`
- **Password**: `packmovego2024`
- **Port**: `2222` (configurable)
- **Host**: Your server IP address

### Example Connection

```bash
# Connect to localhost (development)
ssh -p 2222 admin@localhost

# Connect to production server
ssh -p 2222 admin@api.packmovego.com
```

## API Endpoints

### SSH Management Endpoints

#### `GET /api/ssh/status`
Get SSH server status and active sessions.

**Response:**
```json
{
  "success": true,
  "ssh": {
    "enabled": true,
    "port": 2222,
    "host": "0.0.0.0",
    "maxConnections": 5,
    "sessionTimeout": 600000,
    "activeConnections": 2,
    "sessions": [
      {
        "id": "172.58.117.103-1752894239704",
        "username": "admin",
        "ip": "172.58.117.103",
        "lastActivity": 1752894239704,
        "timeRemaining": 540000
      }
    ]
  }
}
```

#### `GET /api/ssh/config`
Get SSH server configuration.

**Response:**
```json
{
  "success": true,
  "config": {
    "port": 2222,
    "host": "0.0.0.0",
    "allowedIPs": ["76.76.21.21", "172.58.117.103", "172.58.115.96"],
    "frontendIP": "76.76.21.21",
    "sessionTimeout": 600000,
    "maxConnections": 5
  }
}
```

#### `GET /api/ssh/instructions`
Get SSH connection instructions.

**Response:**
```json
{
  "success": true,
  "instructions": {
    "connection": "ssh -p 2222 admin@0.0.0.0",
    "password": "packmovego2024",
    "allowedIPs": ["76.76.21.21", "172.58.117.103", "172.58.115.96"],
    "sessionTimeout": "600 seconds",
    "commands": [
      "help - Show available commands",
      "status - Show server status",
      "logs - View server logs",
      "restart - Restart the server",
      "exit - Disconnect from SSH"
    ]
  }
}
```

#### `POST /api/ssh/disconnect/:sessionId`
Disconnect a specific SSH session.

**Response:**
```json
{
  "success": true,
  "message": "SSH session 172.58.117.103-1752894239704 disconnected",
  "session": {
    "id": "172.58.117.103-1752894239704",
    "username": "admin",
    "ip": "172.58.117.103"
  }
}
```

#### `POST /api/ssh/disconnect-all`
Disconnect all SSH sessions.

**Response:**
```json
{
  "success": true,
  "message": "Disconnected 2 SSH sessions",
  "disconnectedSessions": [
    {
      "id": "172.58.117.103-1752894239704",
      "username": "admin",
      "ip": "172.58.117.103"
    }
  ]
}
```

## Security Features

### IP-Based Access Control
- Only IPs in `ALLOWED_IPS` can connect
- Frontend IP gets direct access
- Unauthorized IPs are blocked immediately

### Session Management
- 10-minute session timeout
- Automatic cleanup of expired sessions
- Session tracking with activity monitoring

### Authentication
- Password-based authentication
- Same password as web interface
- No public key authentication (for simplicity)

### Connection Limits
- Maximum 5 concurrent connections
- Rate limiting on connection attempts
- Automatic cleanup on disconnect

## Usage Examples

### Basic SSH Session

```bash
# Connect to server
ssh -p 2222 admin@localhost

# Welcome message appears
╔══════════════════════════════════════════════════════════════╗
║                    PackMoveGO SSH Access                    ║
╠══════════════════════════════════════════════════════════════╣
║  Welcome to PackMoveGO Server Terminal                      ║
║  IP Address: 172.58.117.103                                ║
║  Session Timeout: 10 minutes                               ║
║  Type 'help' for available commands                        ║
╚══════════════════════════════════════════════════════════════╝

# Run commands
$ whoami
admin

$ pwd
/

$ ls -la
total 0
drwxr-xr-x   1 root root 4096 Jul 19 03:04 .
drwxr-xr-x   1 root root 4096 Jul 19 03:04 ..
```

### Server Management Commands

```bash
# Check server status
$ ps aux | grep node

# View logs
$ tail -f /var/log/app.log

# Check disk usage
$ df -h

# Check memory usage
$ free -h

# Restart server (if needed)
$ pm2 restart all
```

## Monitoring

### Dashboard Integration
The admin dashboard now includes SSH information:
- Active connections count
- SSH configuration details
- Connection instructions
- Session management

### Log Messages
The SSH server provides detailed logging:
- `🔐 SSH connection attempt from IP: x.x.x.x`
- `✅ SSH access granted to IP: x.x.x.x`
- `❌ SSH access denied for IP: x.x.x.x`
- `🔒 SSH session expired for user: admin from IP: x.x.x.x`

### Health Monitoring
- SSH status included in health checks
- Connection count monitoring
- Session timeout tracking

## Testing

### Manual Testing
1. Start the server: `npm run dev`
2. Connect via SSH: `ssh -p 2222 admin@localhost`
3. Enter password: `packmovego2024`
4. Test commands: `whoami`, `pwd`, `ls`

### Automated Testing
Run the SSH test script:
```bash
node test-ssh.js
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if SSH server is running
   - Verify port 2222 is open
   - Check firewall settings

2. **Authentication Failed**
   - Verify password is correct
   - Check if IP is in allowed list
   - Ensure SSH server is configured

3. **Session Timeout**
   - Default is 10 minutes
   - Reconnect if session expires
   - Check server logs for details

4. **Port Already in Use**
   - Change SSH_PORT in environment
   - Kill existing SSH processes
   - Restart the server

### Debug Mode
Enable SSH debug logging:
```env
DEBUG=true
LOG_LEVEL=debug
```

## Security Best Practices

1. **Strong Passwords**: Use strong admin passwords
2. **IP Whitelisting**: Regularly review allowed IPs
3. **Session Monitoring**: Monitor active sessions
4. **Log Review**: Regularly check SSH logs
5. **Key Management**: Use proper SSH host keys in production

## Production Deployment

### Firewall Configuration
```bash
# Allow SSH port
sudo ufw allow 2222/tcp

# Restrict to allowed IPs
sudo ufw allow from 76.76.21.21 to any port 2222
sudo ufw allow from 172.58.117.103 to any port 2222
sudo ufw allow from 172.58.115.96 to any port 2222
```

### Systemd Service
Create `/etc/systemd/system/packmovego-ssh.service`:
```ini
[Unit]
Description=PackMoveGO SSH Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/path/to/packmovego
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Environment Setup
```env
NODE_ENV=production
SSH_PORT=2222
SSH_HOST=0.0.0.0
SSH_HOST_KEY=your_production_key
ADMIN_PASSWORD=your_secure_password
ALLOWED_IPS=your_production_ips
```

## Future Enhancements

- [ ] Public key authentication
- [ ] SFTP file transfer support
- [ ] Command logging and audit
- [ ] Session recording
- [ ] Advanced user management
- [ ] SSH key management interface
- [ ] Connection rate limiting
- [ ] Geo-location restrictions 