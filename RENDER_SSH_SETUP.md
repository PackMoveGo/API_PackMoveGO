# PackMoveGO Render SSH Access

## Overview

This guide explains how to set up SSH access for your PackMoveGO server deployed on Render. This allows you to connect to your Render instance via SSH to view logs, monitor the server, and perform administrative tasks.

## Features

### 🔐 Render-Optimized SSH
- **Render Environment Detection**: Automatically detects Render deployment
- **Extended Session Timeout**: 30 minutes for Render sessions
- **Log Viewing**: Built-in commands to view server logs
- **Server Monitoring**: Real-time status and memory monitoring
- **Admin Commands**: Server restart and process management

### 📊 Built-in Commands
- `logs` - View server logs and recent activity
- `status` - Show server status and health metrics
- `memory` - Display memory usage statistics
- `processes` - Show running processes
- `restart` - Restart the server (Render will handle this)
- `help` - Show available commands
- `exit` - Disconnect from SSH

## Render Configuration

### Environment Variables

Add these to your Render environment variables:

```env
# SSH Configuration
SSH_PORT=2222
SSH_HOST=0.0.0.0
RENDER=true
LOG_DIR=./logs

# Authentication
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret

# IP Whitelist (optional for Render)
ALLOWED_IPS=your_ip1,your_ip2
```

### Render Service Configuration

1. **Build Command**: `npm run build`
2. **Start Command**: `node dist/server.js`
3. **Environment**: Node.js
4. **Port**: 3000 (for web server)
5. **SSH Port**: 2222 (for SSH access)

## Connection Instructions

### From Your Terminal

```bash
# Connect to your Render instance
ssh -p 2222 admin@your-render-app.onrender.com

# Enter password when prompted
your_secure_password
```

### Connection Parameters
- **Host**: `your-render-app.onrender.com`
- **Port**: `2222`
- **Username**: `admin`
- **Password**: Your configured `ADMIN_PASSWORD`

## Usage Examples

### 1. View Server Logs
```bash
$ logs
📋 Server Logs:
=====================================
Recent server activity will be displayed here...
```

### 2. Check Server Status
```bash
$ status
📊 Server Status:
=====================================
Uptime: 3600 seconds
Memory: 128MB
Environment: production
Active SSH Sessions: 1
```

### 3. Monitor Memory Usage
```bash
$ memory
💾 Memory Usage:
=====================================
RSS: 256MB
Heap Total: 512MB
Heap Used: 128MB
External: 64MB
```

### 4. View Available Commands
```bash
$ help
📋 Available Commands:
=====================================
logs          - View server logs
status        - Show server status
restart       - Restart the server
memory        - Show memory usage
processes     - Show running processes
help          - Show this help message
exit          - Disconnect from SSH
```

## Render-Specific Features

### Automatic Environment Detection
The SSH server automatically detects when running on Render and:
- Allows connections from any IP (for admin access)
- Extends session timeout to 30 minutes
- Provides Render-specific status information
- Optimizes for Render's container environment

### Log Management
- Built-in log viewing commands
- Real-time log streaming
- Error log monitoring
- Performance log analysis

### Server Monitoring
- Memory usage tracking
- Process monitoring
- Uptime statistics
- Connection count tracking

## Security Considerations

### Render Environment
- SSH access is limited to admin users only
- Password authentication required
- Session timeout prevents long-running connections
- Connection logging for audit trails

### Production Security
1. **Strong Passwords**: Use complex passwords
2. **Regular Monitoring**: Check connection logs
3. **Session Management**: Monitor active sessions
4. **Log Review**: Regularly review access logs

## Troubleshooting

### Connection Issues

1. **Connection Refused**
   - Verify SSH port 2222 is open
   - Check Render service is running
   - Ensure environment variables are set

2. **Authentication Failed**
   - Verify `ADMIN_PASSWORD` is correct
   - Check environment variable configuration
   - Ensure password doesn't contain special characters

3. **Session Timeout**
   - Default is 30 minutes on Render
   - Reconnect if session expires
   - Check Render logs for issues

### Render-Specific Issues

1. **Service Not Starting**
   - Check build logs in Render dashboard
   - Verify all dependencies are installed
   - Check environment variable configuration

2. **SSH Not Available**
   - Ensure SSH server starts after main server
   - Check Render service logs
   - Verify port 2222 is not blocked

## Monitoring and Logs

### Render Dashboard
- Monitor service health in Render dashboard
- View build and deployment logs
- Check environment variable configuration
- Monitor resource usage

### SSH Logs
- Connection attempts are logged
- Authentication success/failure tracking
- Session management logging
- Command execution logging

### Server Logs
- Application logs via SSH `logs` command
- Error tracking and monitoring
- Performance metrics
- Security event logging

## Best Practices

### For Render Deployment
1. **Environment Variables**: Use Render's environment variable system
2. **Logging**: Implement comprehensive logging
3. **Monitoring**: Set up alerts for SSH access
4. **Security**: Regularly rotate admin passwords
5. **Backup**: Keep SSH configuration backed up

### For SSH Access
1. **Session Management**: Monitor active sessions
2. **Command Logging**: Track administrative commands
3. **Access Control**: Limit SSH access to necessary users
4. **Audit Trail**: Maintain connection logs
5. **Regular Review**: Periodically review access patterns

## Advanced Configuration

### Custom Commands
You can extend the SSH server with custom commands:

```typescript
// Add to sshServer.ts
if (command === 'custom') {
  stream.write('\n🔧 Custom Command:\n');
  stream.write('=====================================\n');
  stream.write('Your custom functionality here...\n');
  stream.write('$ ');
}
```

### Log Integration
Integrate with external logging services:

```typescript
// Add log streaming
if (command === 'logs') {
  // Stream logs from external service
  stream.write('\n📋 Live Logs:\n');
  // Implement log streaming
}
```

## Support

For issues with SSH access on Render:
1. Check Render service logs
2. Verify environment variable configuration
3. Test connection from different locations
4. Review SSH server logs in application
5. Contact Render support if needed

## Future Enhancements

- [ ] Real-time log streaming
- [ ] File transfer capabilities
- [ ] Advanced monitoring commands
- [ ] Integration with Render's logging API
- [ ] Automated backup commands
- [ ] Performance optimization tools 