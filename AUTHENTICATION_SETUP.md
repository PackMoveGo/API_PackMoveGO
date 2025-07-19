# PackMoveGO Authentication System

## Overview

This document describes the IP-based authentication system implemented for `api.packmovego.com`. The system provides secure access control with password protection for authorized IP addresses while allowing direct access for the frontend IP.

## Features

### 🔐 IP-Based Access Control
- **Frontend IP**: Direct access without password (first IP in `ALLOWED_IPS`)
- **Other Allowed IPs**: Password required for access
- **Unauthorized IPs**: Redirected to `packmovego.com`

### 🕐 Session Management
- **Session Duration**: 10 minutes
- **Auto-logout**: Sessions expire automatically
- **JWT Tokens**: Secure token-based authentication
- **Cookie Support**: HTTP-only cookies for security

### 🛡️ Security Features
- **IP Validation**: Ensures tokens match originating IP
- **Session Cleanup**: Automatic cleanup of expired sessions
- **Rate Limiting**: Built-in protection against brute force
- **Secure Headers**: Comprehensive security headers

## Configuration

### Environment Variables

Add these to your `config/.env` file:

```env
# IP Configuration
ALLOWED_IPS=76.76.21.21,172.58.117.103,172.58.115.96
ADMIN_PASSWORD=packmovego2024

# JWT Configuration (already exists)
JWT_SECRET=a131fba4ee1366460f9b1da9ae09e620076459338f7248af25eb09c3b9a613fc33e2b8b9a2b931246f74c6e7f7844a66214363d625e65cd138aa92e5d4691ce0

# Redirect URL (optional)
REDIRECT_URL=https://www.packmovego.com
```

### IP Address Configuration

- **First IP** (`76.76.21.21`): Frontend IP - gets direct access
- **Other IPs**: Require password authentication
- **Unauthorized IPs**: Redirected to main website

## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/login`
Authenticate with admin password.

**Request:**
```json
{
  "password": "packmovego2024"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "token": "jwt_token_here",
  "expiresIn": 600000
}
```

#### `POST /api/auth/logout`
Logout and clear session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### `GET /api/auth/status`
Check authentication status.

**Response:**
```json
{
  "success": true,
  "authenticated": true,
  "ip": "172.58.117.103",
  "isFrontend": false,
  "isAllowed": true,
  "requiresPassword": true
}
```

#### `GET /api/auth/protected`
Example protected resource.

**Response:**
```json
{
  "success": true,
  "message": "Access granted to protected resource",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Web Pages

#### `GET /login`
Login page for password authentication.

#### `GET /dashboard`
Admin dashboard (requires authentication).

## Access Flow

### 1. Frontend IP Access
```
Request from 76.76.21.21 → Direct Access ✅
```

### 2. Allowed IP Access (Non-Frontend)
```
Request from 172.58.117.103 → Check Authentication
├─ Authenticated → Access Granted ✅
└─ Not Authenticated → Show Login Page 🔐
```

### 3. Unauthorized IP Access
```
Request from unauthorized IP → Redirect to packmovego.com 🔄
```

## Security Features

### IP Validation
- Tokens are bound to specific IP addresses
- Prevents token reuse from different locations
- Automatic IP detection from various headers

### Session Management
- 10-minute session duration
- Automatic cleanup of expired sessions
- Secure cookie storage with HTTP-only flag

### Rate Limiting
- Built-in protection against brute force attacks
- Configurable limits per IP address
- Health endpoints excluded from limits

## Testing

### Manual Testing
1. Start the server: `npm run dev`
2. Visit `http://localhost:3000/login`
3. Enter password: `packmovego2024`
4. Access dashboard: `http://localhost:3000/dashboard`

### Automated Testing
Run the test script:
```bash
node test-auth.js
```

## Deployment

### Production Setup
1. Update `ALLOWED_IPS` with production IPs
2. Change `ADMIN_PASSWORD` to a strong password
3. Ensure `JWT_SECRET` is secure and unique
4. Set `NODE_ENV=production`

### Environment Variables for Production
```env
NODE_ENV=production
ALLOWED_IPS=your_frontend_ip,your_admin_ip1,your_admin_ip2
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_secure_jwt_secret
REDIRECT_URL=https://www.packmovego.com
```

## Monitoring

### Log Messages
The system provides detailed logging:

- `🔐 Auth check for IP: x.x.x.x accessing: /path`
- `✅ Frontend IP x.x.x.x granted direct access`
- `🔒 Authentication required for IP: x.x.x.x`
- `✅ Login successful for IP: x.x.x.x`
- `❌ Login failed for IP: x.x.x.x - Invalid password`

### Health Monitoring
- `/api/health` endpoint provides server status
- Authentication status included in health checks
- Session information available in dashboard

## Troubleshooting

### Common Issues

1. **IP Not Recognized**
   - Check `ALLOWED_IPS` configuration
   - Verify IP detection from proxy headers
   - Test with `curl -H "X-Forwarded-For: your_ip"`

2. **Authentication Fails**
   - Verify `ADMIN_PASSWORD` in environment
   - Check JWT token expiration
   - Ensure cookies are enabled

3. **Session Expires Too Quickly**
   - Default is 10 minutes
   - Can be adjusted in `authMiddleware.ts`
   - Consider using Redis for production

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=true
LOG_LEVEL=debug
```

## Security Best Practices

1. **Regular Password Changes**: Update `ADMIN_PASSWORD` regularly
2. **IP Monitoring**: Monitor access logs for suspicious activity
3. **Token Security**: Use strong JWT secrets
4. **HTTPS Only**: Ensure all production traffic uses HTTPS
5. **Rate Limiting**: Monitor and adjust rate limits as needed

## Future Enhancements

- [ ] Redis session storage for production
- [ ] Multi-factor authentication
- [ ] Audit logging
- [ ] IP whitelist management interface
- [ ] Session extension functionality
- [ ] Backup authentication methods 