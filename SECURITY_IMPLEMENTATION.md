# 🔐 Security Implementation Guide

## Overview
This document outlines the comprehensive security implementation for the PackMoveGO API, including all security measures, configurations, and best practices.

## 🚀 Quick Start

### 1. Generate Secure Secrets
```bash
node script/generate-secrets.js
```

### 2. Set Environment Variables
Copy the generated secrets to your Render dashboard environment variables.

### 3. Test Security Configuration
```bash
npm run test:security
```

## 🛡️ Security Features Implemented

### 1. Authentication & Authorization
- **JWT Token Management**: Secure token generation and validation
- **API Key Authentication**: Frontend and admin API keys
- **Role-Based Access Control**: Admin, user, and guest roles
- **Session Management**: Secure session handling with cookies

### 2. Request Protection
- **Rate Limiting**: 50 requests per 15 minutes in production
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Pattern-based attack detection
- **XSS Protection**: Cross-site scripting prevention
- **Path Traversal Protection**: Directory traversal attack prevention

### 3. Security Headers
- **Helmet.js**: Comprehensive security headers
- **HSTS**: HTTP Strict Transport Security
- **CSP**: Content Security Policy
- **XSS Protection**: Browser XSS protection
- **Clickjacking Prevention**: Frame options

### 4. Advanced Security
- **Real-time Threat Analysis**: Automatic threat detection
- **IP Blocking**: Dynamic IP blocking for suspicious activity
- **Security Monitoring**: Comprehensive event logging
- **Request Size Limiting**: 1MB request size limit

## 📋 Configuration

### Environment Variables

#### Required Security Variables
```bash
# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# API Keys
API_KEY_ENABLED=true
API_KEY_FRONTEND=your_frontend_key
API_KEY_ADMIN=your_admin_key

# Admin Access
ADMIN_PASSWORD=your_admin_password
SSH_PASSWORD=your_ssh_password

# Security
WEBHOOK_SECRET=your_webhook_secret
SESSION_SECRET=your_session_secret
```

#### Optional Security Variables
```bash
# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_WINDOW_MS=900000

# CORS Configuration
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,x-api-key

# Maintenance Mode
MAINTENANCE_MODE=false
```

## 🔧 Security Middleware

### 1. API Key Validation
```typescript
// Validates API keys for protected endpoints
const validateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  // Implementation in src/middleware/security.ts
};
```

### 2. Request Validation
```typescript
// Validates requests for attack patterns
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Implementation in src/middleware/security.ts
};
```

### 3. Rate Limiting
```typescript
// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 100
});
```

### 4. Security Headers
```typescript
// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: { /* CSP configuration */ },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  // ... other headers
});
```

## 📊 Security Monitoring

### 1. Security Events
The system logs various security events:
- Suspicious requests
- Failed authentication attempts
- Rate limit violations
- Attack pattern detection
- IP blocking events

### 2. Security Analytics
```typescript
// Get security statistics
const securityStats = advancedSecurity.getSecurityStats();
```

### 3. Security Endpoints
- `GET /security/status` - Security status and statistics
- `GET /security/events` - Recent security events
- `POST /security/block-ip` - Manually block IP
- `POST /security/unblock-ip` - Manually unblock IP
- `GET /security/analytics` - Security analytics
- `GET /security/config` - Security configuration

## 🔍 Threat Detection

### 1. Attack Patterns Detected
- SQL Injection attempts
- XSS (Cross-site scripting) attempts
- Path traversal attacks
- Command injection attempts
- File inclusion attacks
- Script injection attempts

### 2. Risk Scoring
The system assigns risk scores based on:
- Attack pattern matches
- Request size
- User agent analysis
- Request frequency
- Suspicious behavior patterns

### 3. Automatic Responses
- **Low Risk**: Monitor and log
- **Medium Risk**: Log and warn
- **High Risk**: Block IP temporarily
- **Critical Risk**: Block IP and alert

## 🚨 Security Alerts

### 1. Console Logging
```bash
# Security event examples
🚫 Attack detected from IP: 192.168.1.100, Path: /api/admin
⚠️ HIGH SECURITY EVENT: suspicious_request from 203.0.113.50
🔒 IP 192.168.1.100 manually blocked: Manual block
```

### 2. Security Monitoring
- Real-time threat analysis
- IP blocking/unblocking
- Security event tracking
- Performance monitoring
- Authentication monitoring

## 🔧 Testing Security

### 1. Security Tests
```bash
# Run security tests
npm run test:security

# Test production security
npm run test:security:prod
```

### 2. Manual Testing
```bash
# Test API key authentication
curl -H "x-api-key: your_frontend_key" https://api.packmovego.com/security/status

# Test rate limiting
for i in {1..60}; do curl https://api.packmovego.com/health; done

# Test attack patterns (should be blocked)
curl "https://api.packmovego.com/api/test?q=<script>alert('xss')</script>"
```

## 📈 Security Metrics

### 1. Key Metrics
- Total security events
- Events by type (suspicious_request, rate_limit_exceeded, etc.)
- Events by severity (low, medium, high, critical)
- Blocked IPs count
- Average risk score
- Top attack patterns

### 2. Performance Impact
- Security middleware adds ~5-10ms to request processing
- Rate limiting prevents abuse without affecting legitimate users
- Threat analysis runs in background without blocking requests

## 🔄 Security Updates

### 1. Regular Updates
- Update dependencies regularly
- Monitor security advisories
- Review and update attack patterns
- Rotate secrets periodically

### 2. Incident Response
1. **Detection**: Automatic threat detection
2. **Analysis**: Security event analysis
3. **Response**: Automatic IP blocking
4. **Recovery**: Manual review and unblocking
5. **Prevention**: Pattern updates and monitoring

## 📚 Best Practices

### 1. Development
- Never commit secrets to version control
- Use environment variables for all sensitive data
- Implement proper error handling
- Log security events appropriately
- Test security features regularly

### 2. Production
- Use strong, unique secrets
- Enable all security features
- Monitor security logs regularly
- Keep dependencies updated
- Implement proper backup strategies

### 3. Maintenance
- Rotate secrets periodically
- Review security logs weekly
- Update attack patterns as needed
- Monitor for new threat vectors
- Test security measures regularly

## 🆘 Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify API keys are set correctly
   - Check API key format and length
   - Ensure API key authentication is enabled

2. **Rate Limiting Issues**
   - Check rate limit configuration
   - Verify IP whitelisting for trusted IPs
   - Review rate limit logs

3. **Security Blocking**
   - Check security event logs
   - Review blocked IPs list
   - Verify attack pattern detection

4. **Performance Issues**
   - Monitor security middleware performance
   - Check for excessive logging
   - Review rate limiting impact

## 📞 Support

For security-related issues:
- Check security logs in console
- Review security event history
- Contact security team
- Follow incident response procedures

## 🔗 Related Documentation

- [Security Setup Guide](SECURITY_SETUP.md)
- [Security Policy](SECURITY.md)
- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](API_ROUTES.md) 