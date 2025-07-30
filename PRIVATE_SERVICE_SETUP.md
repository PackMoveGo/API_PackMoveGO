# Private Service Setup - PackMoveGO API

## Overview

This guide covers converting your PackMoveGO API to use private services in Render. Private services are not accessible from the public internet and can only be accessed by other services within the same private network.

## 🏗️ Architecture

### Service Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Render Private Network                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Public Web    │    │        Private API             │ │
│  │    Gateway      │◄──►│      (Not Public)              │ │
│  │                 │    │                                 │ │
│  │ • Proxy Service │    │ • Main API Logic               │ │
│  │ • CORS Handling │    │ • Database Access              │ │
│  │ • Rate Limiting │    │ • Business Logic               │ │
│  │ • Auth Gateway  │    │ • Load Balancing               │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of Private Services

1. **Enhanced Security**: API logic is not directly accessible from internet
2. **Network Isolation**: Services communicate only within private network
3. **Better Control**: Gateway handles all external traffic
4. **Scalability**: Private services can scale independently
5. **Monitoring**: Separate monitoring for gateway and API layers

## 🔧 Configuration

### 1. Private API Service (`render.yaml`)

```yaml
services:
  # Private API service - not accessible from public internet
  - type: private
    name: pack-go-movers-api-private
    env: node
    repo: https://github.com/SereneAura2/PackMoveGO-API
    buildCommand: npm install && npm run build
    startCommand: node dist/server.js
    scaling:
      minInstances: 2
      maxInstances: 5
      targetConcurrency: 10
      targetCpuUtilizationPercent: 70
    port: 3000
    internalOnly: true
    envVars:
      - key: SERVICE_TYPE
        value: private
      - key: PRIVATE_LINK_ENABLED
        value: true
      # ... other environment variables
```

### 2. Public Gateway Service (`render.yaml`)

```yaml
  # Public gateway service - accessible from internet
  - type: web
    name: pack-go-movers-gateway
    env: node
    repo: https://github.com/SereneAura2/PackMoveGO-API
    buildCommand: npm install && npm run build
    startCommand: node dist/gateway.js
    envVars:
      - key: SERVICE_TYPE
        value: gateway
      - key: PRIVATE_API_URL
        value: "http://pack-go-movers-api-private:3000"
      # ... other environment variables
```

## 🚀 Implementation Details

### 1. Gateway Service (`src/gateway.ts`)

The gateway service acts as a proxy between the public internet and your private API:

#### Features:
- **Request Proxying**: Forwards all API requests to private service
- **CORS Handling**: Manages cross-origin requests
- **Security Headers**: Adds security and monitoring headers
- **Error Handling**: Graceful error handling for private service issues
- **Logging**: Comprehensive request/response logging

#### Proxy Configuration:
```typescript
const proxyOptions = {
  target: PRIVATE_API_URL,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // Add gateway headers
    proxyReq.setHeader('X-Gateway-Service', 'pack-go-movers-gateway');
    proxyReq.setHeader('X-Original-Host', req.get('Host'));
  },
  onError: (err, req, res) => {
    // Handle private service errors
    res.status(502).json({
      error: 'Gateway Error',
      message: 'Unable to connect to private API service'
    });
  }
};
```

### 2. Private Service Modifications (`src/server.ts`)

The private service runs the same API logic but with additional private service awareness:

```typescript
const serviceType = process.env.SERVICE_TYPE || 'web';
const isPrivateService = serviceType === 'private';

if (isPrivateService) {
  consoleLogger.info('system', '🔒 Running as PRIVATE service');
  consoleLogger.info('system', '📡 Only accessible by other services in private network');
}
```

## 📊 Service Communication

### Internal Service Discovery

Private services can communicate using Render's internal DNS:

```typescript
// Gateway to Private API
const PRIVATE_API_URL = "http://pack-go-movers-api-private:3000";

// Private API to other private services
const DATABASE_URL = "http://private-database:27017";
const REDIS_URL = "http://private-redis:6379";
```

### Health Checks

Each service has its own health check endpoint:

```bash
# Gateway health check
curl https://your-gateway.onrender.com/health

# Private API health check (internal only)
curl http://pack-go-movers-api-private:3000/health
```

## 🔐 Security Considerations

### 1. Network Security

- **Private Network**: Services communicate only within Render's private network
- **No Public Access**: Private services cannot be accessed from the internet
- **Internal DNS**: Services use internal hostnames for communication

### 2. Authentication & Authorization

```typescript
// Gateway handles public authentication
app.use('/auth', createProxyMiddleware(proxyOptions));

// Private service handles internal authentication
app.use('/internal/auth', internalAuthMiddleware);
```

### 3. Rate Limiting

```typescript
// Gateway rate limiting for public traffic
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// Private service rate limiting for internal traffic
app.use('/internal', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
}));
```

## 🎯 Deployment Steps

### 1. **Update Configuration**

1. Update `render.yaml` with private service configuration
2. Set environment variables for both services
3. Configure service discovery

### 2. **Deploy Services**

```bash
# Deploy both services
git add .
git commit -m "Add private service configuration"
git push origin main
```

### 3. **Verify Deployment**

```bash
# Check gateway service
curl https://pack-go-movers-gateway.onrender.com/health

# Check private service (should fail from public internet)
curl https://pack-go-movers-api-private.onrender.com/health
# Expected: Connection refused or timeout
```

### 4. **Test Service Communication**

```bash
# Test API through gateway
curl https://pack-go-movers-gateway.onrender.com/v0/blog

# Verify gateway is proxying to private service
curl -I https://pack-go-movers-gateway.onrender.com/v0/blog
# Should see: X-Gateway-Service: pack-go-movers-gateway
```

## 📈 Monitoring & Debugging

### 1. **Service Logs**

```bash
# Gateway logs
render logs pack-go-movers-gateway

# Private service logs
render logs pack-go-movers-api-private
```

### 2. **Health Monitoring**

```typescript
// Gateway health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gateway',
    privateApiUrl: PRIVATE_API_URL
  });
});

// Private service health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'private-api',
    serviceType: 'private'
  });
});
```

### 3. **Debug Headers**

```typescript
// Gateway adds debug headers
res.setHeader('X-Gateway-Service', 'pack-go-movers-gateway');
res.setHeader('X-Proxied-By', 'gateway');

// Private service adds service headers
res.setHeader('X-Service-Type', 'private');
res.setHeader('X-Service-Name', 'pack-go-movers-api-private');
```

## 🚨 Troubleshooting

### Common Issues

1. **Private Service Not Accessible**
   - Verify service is deployed as `type: private`
   - Check internal DNS resolution
   - Verify port configuration

2. **Gateway Connection Errors**
   - Check `PRIVATE_API_URL` environment variable
   - Verify private service is running
   - Check network connectivity

3. **CORS Issues**
   - Ensure gateway handles CORS properly
   - Check origin configuration
   - Verify preflight requests

### Debug Commands

```bash
# Test gateway service
curl -v https://pack-go-movers-gateway.onrender.com/health

# Test private service (should fail)
curl -v https://pack-go-movers-api-private.onrender.com/health

# Check service discovery
curl -H "X-Gateway-Service: test" https://pack-go-movers-gateway.onrender.com/v0/blog
```

## 💰 Cost Considerations

### Render Pricing for Private Services

- **Private Services**: Available on Professional plan and above
- **Professional Plan**: $25/month - includes private services
- **Pro Plan**: $100/month - advanced private networking
- **Enterprise Plan**: Custom pricing - full private network features

### Optimization Tips

1. **Start with Gateway**: Deploy gateway first, then private service
2. **Monitor Usage**: Track gateway and private service usage separately
3. **Optimize Communication**: Minimize inter-service communication overhead
4. **Use Caching**: Implement caching in gateway to reduce private service load

## 🔄 Migration Strategy

### From Public to Private Service

1. **Phase 1**: Deploy gateway service alongside existing public service
2. **Phase 2**: Update DNS to point to gateway service
3. **Phase 3**: Deploy private service and update gateway configuration
4. **Phase 4**: Remove old public service

### Rollback Plan

```bash
# Quick rollback to public service
# Update DNS to point back to public service URL
# Remove private service configuration
```

## 📞 Support

For issues with private services:

1. **Render Documentation**: https://render.com/docs/private-services
2. **Render Support**: Available in your Render dashboard
3. **Community**: Render Discord and forums

---

## 🚀 Quick Start Checklist

- [ ] Update `render.yaml` with private service configuration
- [ ] Deploy gateway service first
- [ ] Deploy private service
- [ ] Test service communication
- [ ] Update DNS to point to gateway
- [ ] Monitor both services
- [ ] Configure alerts for service health
- [ ] Document service architecture

Your PackMoveGO API is now running as a secure private service! 🔒 