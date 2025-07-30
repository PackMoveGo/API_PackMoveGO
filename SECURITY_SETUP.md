# 🔐 Security Setup Guide

## Overview
This guide explains how to configure the security features for your PackMoveGo API. IP whitelisting has been removed to ensure mobile compatibility and public API access.

## 🚀 Quick Start

### 1. Environment Variables

Add these environment variables to your `.env` file or Render dashboard:

```bash
# Security Configuration
ADMIN_PASSWORD=your_admin_password  # Admin password for SSH access
JWT_SECRET=your_jwt_secret         # JWT secret for authentication
API_KEY_ENABLED=false              # Enable API key authentication (optional)
```

### 2. Security Modes

#### 🌐 Public Mode (Default)
```bash
API_KEY_ENABLED=false
```
- Allows all IPs to access your API
- No IP restrictions
- Good for public APIs and mobile apps

#### 🔒 Restricted Mode
```bash
API_KEY_ENABLED=true
```
- Requires API key authentication
- Still allows all IPs
- Good for controlled API access

## 📋 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD` | `packmovego2024` | Admin password for SSH access |
| `JWT_SECRET` | `auto-generated` | JWT secret for authentication |
| `API_KEY_ENABLED` | `false` | Enable API key authentication |

## 🔧 Setup Instructions

### For Development
```bash
# .env file
ADMIN_PASSWORD=your_dev_password
JWT_SECRET=your_dev_jwt_secret
API_KEY_ENABLED=false
```

### For Production (Public API)
```bash
# Render Environment Variables
ADMIN_PASSWORD=your_production_password
JWT_SECRET=your_production_jwt_secret
API_KEY_ENABLED=false
```

### For Production (Restricted API)
```bash
# Render Environment Variables
ADMIN_PASSWORD=your_production_password
JWT_SECRET=your_production_jwt_secret
API_KEY_ENABLED=true
```

## 🛡️ Security Features

### 1. Rate Limiting
- 50 requests per 15 minutes in production
- 100 requests per 15 minutes in development
- Exempts health checks

### 2. Attack Prevention
- Blocks common attack patterns
- Prevents path traversal attacks
- Blocks malicious scripts and SQL injection

### 3. Security Headers
- XSS protection
- Clickjacking prevention
- MIME type sniffing prevention
- HSTS in production

### 4. Request Validation
- Validates request size (1MB limit)
- Checks for malicious patterns
- Logs suspicious activity

### 5. CORS Configuration
- Mobile-friendly CORS settings
- Allows all origins for mobile compatibility
- Proper headers for cross-origin requests

## 📊 Monitoring

### Logs to Watch For

#### ✅ Allowed Requests
```
✅ Public API mode - allowing 192.168.1.100 for /api/v0/nav
✅ Mobile device allowed: 203.0.113.25 - User-Agent: Mobile Safari
✅ Frontend request allowed from https://www.packmovego.com
```

#### 🚫 Blocked Requests
```
🚫 Attack detected from IP: 203.0.113.50, Path: /api/v0/nav
```

#### 🤖 Bot Detection
```
🤖 Bot detected: Googlebot/2.1 from 66.249.66.1 accessing /api/v0/services
```

#### ⚠️ Security Warnings
```
⚠️ Sensitive endpoint accessed: /api/admin/config by 192.168.1.100
```

## 🔍 Testing

### Test Public API Access
```bash
# Test from different IPs
curl https://api.packmovego.com/api/health
curl -H "User-Agent: Mobile Safari" https://api.packmovego.com/api/v0/nav
```

### Test Mobile Compatibility
```bash
# Test mobile endpoints
curl https://api.packmovego.com/mobile/health
curl https://api.packmovego.com/mobile/test
```

## 🚨 Troubleshooting

### Common Issues

1. **API not accessible from frontend**
   - Check CORS configuration
   - Verify API key settings if enabled

2. **Mobile apps can't connect**
   - Ensure mobile endpoints are working
   - Check CORS headers

3. **Health checks failing**
   - Health checks are always allowed
   - Check Render logs for other issues

### Debug Commands

```bash
# Check current security configuration
npm run dev
# Look for security configuration logs at startup

# Test mobile endpoints
curl https://api.packmovego.com/mobile/health
curl https://api.packmovego.com/mobile/test
```

## 📝 Best Practices

1. **Start with Public Mode** - Test your API works before enabling restrictions
2. **Monitor Logs** - Watch for security warnings and adjust accordingly
3. **Test Mobile Access** - Ensure mobile apps can access the API
4. **Use Strong Passwords** - Set strong admin passwords
5. **Keep Logs Enabled** - Helps with debugging and monitoring

## 🔄 Migration Guide

### From IP Whitelist to Public API
1. IP whitelisting has been removed
2. All IPs are now allowed
3. Mobile compatibility is improved
4. Test that all clients can access the API

### Enabling API Key Authentication
1. Set `API_KEY_ENABLED=true`
2. Configure API keys for frontend and admin
3. Update frontend to include API keys
4. Test thoroughly

## 📞 Support

If you encounter issues:
e1. Check the logs for error messages
2. Verify environment variable configuration
3. Test with different devices and networks
4. Review the security configuration logs at startup 