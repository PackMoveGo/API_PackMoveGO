# 🚀 PackMoveGO API Testing Guide

This guide provides comprehensive instructions for testing `api.packmovego.com` to ensure it works as intended.

## 📋 Quick Start

### Option 1: Automated Testing (Recommended)

1. **Node.js Testing Script**
   ```bash
   # Run comprehensive automated tests
   node test-api-endpoints.js
   
   # Run with verbose output
   node test-api-endpoints.js --verbose
   
   # Test specific endpoint
   node test-api-endpoints.js --endpoint=/auth/login
   ```

2. **cURL Testing Script**
   ```bash
   # Make executable and run
   chmod +x test-api-curl.sh
   ./test-api-curl.sh
   ```

### Option 2: Manual Testing

Use the manual testing commands below to test specific endpoints.

## 🔍 Health & Status Endpoints

### Basic Health Check
```bash
curl -X GET https://api.packmovego.com/health
```

### Detailed Health Check
```bash
curl -X GET https://api.packmovego.com/api/health
```

### Heartbeat Check
```bash
curl -X GET https://api.packmovego.com/api/heartbeat
```

### Ping Test
```bash
curl -X GET https://api.packmovego.com/api/ping
```

## 📊 Data Endpoints

### Content Data
```bash
# About page data
curl -X GET https://api.packmovego.com/data/about

# Blog data
curl -X GET https://api.packmovego.com/data/blog

# Contact information
curl -X GET https://api.packmovego.com/data/contact

# Locations
curl -X GET https://api.packmovego.com/data/locations

# Navigation
curl -X GET https://api.packmovego.com/data/nav

# Reviews
curl -X GET https://api.packmovego.com/data/reviews

# Services
curl -X GET https://api.packmovego.com/data/services

# Supplies
curl -X GET https://api.packmovego.com/data/supplies

# Testimonials
curl -X GET https://api.packmovego.com/data/testimonials
```

### v0 Data Endpoints (Alternative)
```bash
# Test v0 endpoints
curl -X GET https://api.packmovego.com/v0/about
curl -X GET https://api.packmovego.com/v0/services
curl -X GET https://api.packmovego.com/v0/reviews
```

## 🚚 Services Endpoints

### Get All Services
```bash
curl -X GET https://api.packmovego.com/v1/services
```

### Service Analytics
```bash
curl -X GET https://api.packmovego.com/v1/services/analytics
```

## 🔐 Authentication Endpoints

### User Login
```bash
curl -X POST https://api.packmovego.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@packmovego.com",
    "password": "testpassword123"
  }'
```

### User Registration
```bash
curl -X POST https://api.packmovego.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@packmovego.com",
    "password": "securepassword123"
  }'
```

### Token Verification
```bash
curl -X GET https://api.packmovego.com/auth/verify
```

### Get Current User (requires token)
```bash
curl -X GET https://api.packmovego.com/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📈 Analytics Endpoints

### Performance Metrics
```bash
curl -X GET https://api.packmovego.com/analytics/performance
```

### Real-time Analytics
```bash
curl -X GET https://api.packmovego.com/analytics/realtime
```

### Analytics Export
```bash
curl -X GET https://api.packmovego.com/analytics/export
```

### System Health
```bash
curl -X GET https://api.packmovego.com/analytics/health
```

## 🔒 Security Endpoints

### Verify Security Sections
```bash
curl -X POST https://api.packmovego.com/security/verify-sections \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 🚀 Prelaunch Endpoints

### Get Subscribers
```bash
curl -X GET https://api.packmovego.com/prelaunch/subscribers
```

### Get Early Subscribers
```bash
curl -X GET https://api.packmovego.com/prelaunch/early_subscribers
```

## 🌐 CORS Testing

### Test CORS Headers
```bash
curl -I -H "Origin: https://www.packmovego.com" \
  https://api.packmovego.com/health
```

### Test with Different Origins
```bash
# Test with localhost
curl -I -H "Origin: http://localhost:3000" \
  https://api.packmovego.com/health

# Test with Vercel
curl -I -H "Origin: https://*.vercel.app" \
  https://api.packmovego.com/health
```

## ⏱️ Performance Testing

### Response Time Test
```bash
time curl -s -o /dev/null https://api.packmovego.com/health
```

### Load Testing (requires Apache Bench)
```bash
# Test with 10 requests, 2 concurrent
ab -n 10 -c 2 https://api.packmovego.com/health
```

## 🔐 SSL/TLS Testing

### SSL Certificate Check
```bash
openssl s_client -connect api.packmovego.com:443 -servername api.packmovego.com
```

### SSL Labs Test
Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.packmovego.com

## 📱 Mobile Testing

### Test Mobile Headers
```bash
curl -X GET https://api.packmovego.com/health \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
```

## 🧪 Advanced Testing

### Test with Different HTTP Methods
```bash
# Test OPTIONS (CORS preflight)
curl -X OPTIONS https://api.packmovego.com/health

# Test HEAD
curl -I https://api.packmovego.com/health
```

### Test Error Handling
```bash
# Test non-existent endpoint
curl -X GET https://api.packmovego.com/nonexistent

# Test malformed JSON
curl -X POST https://api.packmovego.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"invalid": json}'
```

### Test Rate Limiting
```bash
# Make multiple rapid requests
for i in {1..10}; do
  curl -X GET https://api.packmovego.com/health
  sleep 0.1
done
```

## 📊 Expected Responses

### Successful Health Check
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Successful Data Response
```json
{
  "title": "About Us",
  "content": "About content..."
}
```

### Authentication Response
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

## 🚨 Common Issues & Solutions

### Issue: Connection Refused
**Solution**: Check if the API server is running and accessible

### Issue: SSL Certificate Errors
**Solution**: Verify SSL certificate is valid and properly configured

### Issue: CORS Errors
**Solution**: Check CORS configuration in server settings

### Issue: 401 Unauthorized
**Solution**: Verify authentication tokens and API keys

### Issue: 404 Not Found
**Solution**: Check endpoint URL and server routing

### Issue: 500 Internal Server Error
**Solution**: Check server logs and database connectivity

## 📈 Monitoring & Alerts

### Set up monitoring for:
- Response times
- Error rates
- Uptime
- SSL certificate expiration
- Database connectivity
- Memory usage

### Recommended tools:
- UptimeRobot
- Pingdom
- New Relic
- DataDog

## 🔄 Continuous Testing

### GitHub Actions Example
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: node test-api-endpoints.js
```

## 📞 Support

If you encounter issues:
1. Check the server logs
2. Verify environment variables
3. Test locally first
4. Contact the development team

---

**Last Updated**: January 2024
**API Version**: v1
**Base URL**: https://api.packmovego.com 