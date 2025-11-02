# Gateway Proxy Configuration

## Overview

The PackMoveGO gateway acts as a reverse proxy, forwarding requests from the public internet to the private API server. This document explains how the proxy configuration works and the path preservation fix.

## Architecture

```
Internet → Gateway (Port 3000) → Server (Port 3001/10000) → MongoDB
           Public Access            Internal Only
```

## The Path Preservation Problem (Fixed)

### Previous Issue

When using route-specific mounting with `app.use('/path', proxy)`, Express was stripping the path prefix before forwarding:

```typescript
// ❌ OLD APPROACH - Path Stripping
const proxy=createProxyMiddleware(proxyOptions);
app.use('/auth', proxy);    // Strips /auth from path!
app.use('/data', proxy);    // Strips /data from path!
```

**Request Flow (Broken)**:
```
Client Request:    https://localhost:3000/auth/status
Gateway Received:  /auth/status  ✅
Gateway Forwarded: /status       ❌ (stripped /auth!)
Server Expected:   /auth/status  ✅
Result:            301 Redirect (Forbidden)
```

### Current Solution

Use a filter function that matches paths without mounting on specific routes:

```typescript
// ✅ NEW APPROACH - Path Preservation
const proxy=createProxyMiddleware(
  (pathname, req) => {
    // Match these path prefixes
    return pathname.startsWith('/v0') || 
           pathname.startsWith('/auth') ||
           pathname.startsWith('/data') || 
           pathname.startsWith('/signup') || 
           pathname.startsWith('/sections') ||
           pathname.startsWith('/security') ||
           pathname.startsWith('/services') ||
           pathname.startsWith('/analytics') ||
           pathname.startsWith('/load-balancer') ||
           pathname.startsWith('/internal') ||
           pathname.startsWith('/bookings') ||
           pathname.startsWith('/chat') ||
           pathname.startsWith('/payments') ||
           pathname.startsWith('/api');
  },
  proxyOptions
);

// Apply to all matched routes
app.use(proxy);
```

**Request Flow (Fixed)**:
```
Client Request:    https://localhost:3000/auth/status
Gateway Received:  /auth/status  ✅
Filter Matches:    pathname.startsWith('/auth') → true
Gateway Forwarded: /auth/status  ✅ (full path preserved!)
Server Received:   /auth/status  ✅
Server Handler:    app.get('/auth/status', ...) matches
Response:          200 OK ✅
```

## Proxy Configuration Options

The proxy middleware is configured with several important options:

```typescript
const proxyOptions={
  target: PRIVATE_API_URL,        // Backend server URL
  changeOrigin: true,              // Needed for virtual hosted sites
  ws: true,                        // Enable WebSocket proxying
  secure: false,                   // Accept self-signed certificates (dev)
  
  // Path rewrite - keep original path
  pathRewrite: (path: string, req: any) => {
    return path;  // Don't rewrite, preserve full path
  },

  // Logging
  onProxyReq: (proxyReq, req, res) => {
    log.info('gateway', `→ Proxying ${req.method} ${req.url}`);
  },

  onProxyRes: (proxyRes, req, res) => {
    log.info('gateway', `← Response ${proxyRes.statusCode} for ${req.url}`);
  },

  onError: (err, req, res) => {
    log.error('gateway', `Proxy error: ${err.message}`);
    res.status(502).json({
      success: false,
      error: 'Bad Gateway',
      message: 'Unable to reach backend server'
    });
  }
};
```

## Proxied Routes

All requests matching these path prefixes are proxied to the backend:

| Path Prefix | Description | Example |
|------------|-------------|---------|
| `/v0` | Legacy API endpoints | `/v0/blog`, `/v0/about` |
| `/auth` | Authentication endpoints | `/auth/login`, `/auth/status` |
| `/data` | Data endpoints | `/data/users` |
| `/signup` | User registration | `/signup` |
| `/sections` | Section management | `/sections/home` |
| `/security` | Security endpoints | `/security/validate` |
| `/services` | Service management | `/services/list` |
| `/analytics` | Analytics endpoints | `/analytics/stats` |
| `/load-balancer` | Load balancer routes | `/load-balancer/health` |
| `/internal` | Internal API routes | `/internal/status` |
| `/bookings` | Booking management | `/bookings/create` |
| `/chat` | Chat/messaging | `/chat/messages` |
| `/payments` | Payment processing | `/payments/checkout` |
| `/api` | General API routes | `/api/health` |

## Non-Proxied Routes

The gateway handles these routes directly:

| Route | Description | Handler |
|-------|-------------|---------|
| `/health` | Gateway health check | Returns gateway status |
| `/` | Root endpoint | Welcome message |
| All others | 404 handler | Returns "Not Found" |

## WebSocket Support

The proxy configuration includes WebSocket support (`ws: true`), allowing real-time communication through the gateway:

```typescript
// WebSocket connections are automatically proxied
const socket=io('https://gateway.example.com', {
  path: '/socket.io'
});
```

## Development vs Production Configuration

### Development Mode

```typescript
// config/.env.development.local
GATEWAY_PORT=3000
PRIVATE_API_URL=https://localhost:3001
USE_SSL=true  // Self-signed certificates
```

### Production Mode (Local)

```typescript
// config/.env.production.local
GATEWAY_PORT=3000
PRIVATE_API_URL=http://localhost:10000
USE_SSL=false  // No SSL locally
```

### Render Deployment

```yaml
# render.yaml (Gateway Service)
envVars:
  - key: PRIVATE_API_URL
    value: "http://packmovego-api-private:10000"
```

Render uses internal DNS for service-to-service communication, so the gateway can reach the private service using its service name.

## Adding New Proxied Routes

To add a new route to be proxied:

1. Add the path prefix to the filter function in `src/gateway/gateway.ts`:

```typescript
const proxy=createProxyMiddleware(
  (pathname, req) => {
    return pathname.startsWith('/v0') || 
           pathname.startsWith('/auth') ||
           // ... existing routes ...
           pathname.startsWith('/your-new-route');  // ← Add here
  },
  proxyOptions
);
```

2. Ensure the corresponding route handler exists in the backend server (`src/server.ts` or route files)

3. Test the route:
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  http://localhost:3000/your-new-route
```

## Testing the Gateway

### Test Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status":"ok",
  "service":"gateway",
  "timestamp":"2025-11-02T...",
  "privateApiUrl":"http://localhost:3001"
}
```

### Test Proxied Route

```bash
curl -H "x-api-key: pmg_frontend_live_sk_..." \
  http://localhost:3000/auth/status
```

Expected behavior:
- Gateway receives request at `/auth/status`
- Gateway forwards to server at `/auth/status`
- Server processes and responds
- Gateway returns response to client

## Monitoring & Debugging

### Enable Detailed Logging

Set log level in environment:
```
LOG_LEVEL=debug
```

### Gateway Logs

```
[gateway] → Proxying GET /auth/status
[gateway] ← Response 200 for /auth/status
```

### Server Logs

```
[server] GET /auth/status
[server] Response: 200 (45ms)
```

## Troubleshooting

### Issue: 502 Bad Gateway

**Cause**: Gateway cannot reach backend server

**Solution**:
1. Verify backend server is running
2. Check `PRIVATE_API_URL` is correct
3. Check firewall/network connectivity
4. Review backend server logs

### Issue: 404 Not Found

**Cause**: Route not included in proxy filter function

**Solution**:
1. Add route to filter function in `src/gateway/gateway.ts`
2. Verify route exists on backend server
3. Restart gateway: `npm run dev:gateway`

### Issue: Path Mismatch

**Cause**: Path rewriting or stripping

**Solution**:
1. Verify `pathRewrite` returns original path
2. Check filter function uses `startsWith()` not exact match
3. Review gateway logs to see forwarded path

## Security Considerations

1. **API Key Validation**: Gateway validates API keys before proxying
2. **CORS Headers**: Properly configured for allowed origins
3. **Rate Limiting**: Applied at gateway level via Arcjet
4. **SSL/TLS**: Enabled in development, managed by Render in production
5. **Private Network**: Backend server not accessible from internet

## Performance Optimization

1. **Connection Pooling**: Proxy maintains persistent connections to backend
2. **Request Buffering**: Minimal buffering for streaming support
3. **Compression**: Enabled via compression middleware
4. **Caching Headers**: Preserved from backend responses

## Related Documentation

- See `docs/security/GATEWAY_CONTROLLED_SECURITY.md` for security architecture
- See `RENDER_DEPLOYMENT.md` for deployment configuration
- See `config/ENVIRONMENT_CONFIGURATION.md` for environment setup

