# Both Ports Redirect to PackMoveGo.com ✅

## Summary

**BOTH** `localhost:3001` (server) and `localhost:3000` (gateway) now redirect all unauthorized traffic to `https://packmovego.com`.

## Behavior

### ❌ Unauthorized Access → Redirect

```
🚫 https://localhost:3001/ (no API key)
   → 301 Redirect → https://packmovego.com

🚫 https://localhost:3000/ (no API key)
   → 301 Redirect → https://packmovego.com

🚫 https://localhost:3000/ (bot detected)
   → 301 Redirect → https://packmovego.com

🚫 https://localhost:3000/ (rate limited)
   → 301 Redirect → https://packmovego.com
```

### ✅ Authorized Access → Works

```
✅ https://localhost:3000/ (with valid API key)
   → Gateway validates
   → Adds X-Gateway-Request header
   → Proxies to server
   → Server processes
   → Response returned
```

## Test Results

```bash
$ curl -k -I https://localhost:3001/
HTTP/1.1 301 Moved Permanently
Location: https://packmovego.com

$ curl -k -I https://localhost:3000/
HTTP/1.1 301 Moved Permanently
Location: https://packmovego.com

$ curl -k -H "x-api-key: pmg_frontend_live_sk_..." https://localhost:3000/
{"message":"PackMoveGO Gateway Service","status":"running",...}
```

## Security Flow

### Direct Server Access (Port 3001)
```
User → https://localhost:3001/
     ↓
     Server checks: X-Gateway-Request header?
     ↓
     NOT FOUND (direct access)
     ↓
     Server logs: "🚫 Server - Direct Access Blocked"
     ↓
     Server redirects: 301 → https://packmovego.com
```

### Gateway Access Without API Key (Port 3000)
```
User → https://localhost:3000/
     ↓
     Gateway checks: API key present?
     ↓
     NOT FOUND (missing API key)
     ↓
     Gateway logs: "🚫 Gateway - API Key Missing"
     ↓
     Gateway redirects: 301 → https://packmovego.com
```

### Gateway Access With Valid API Key (Port 3000)
```
User → https://localhost:3000/
     ↓
     Gateway checks: Arcjet (bot, rate limit)
     ↓
     PASS ✅
     ↓
     Gateway checks: API key valid?
     ↓
     VALID ✅
     ↓
     Gateway adds: X-Gateway-Request: true
     ↓
     Gateway proxies → Server
     ↓
     Server checks: X-Gateway-Request header?
     ↓
     FOUND ✅ (from gateway)
     ↓
     Server processes request
     ↓
     Response returned
```

## Implementation

### Server Redirect (src/server.ts)
```typescript
if (isDirectServerAccess && !hasGatewayHeader) {
  console.error('🚫 Server - Direct Access Blocked:', JSON.stringify({
    success: false,
    message: 'Direct server access not allowed',
    error: 'Redirecting to main website',
    ip: req.ip,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  return res.redirect(301, 'https://packmovego.com');
}
```

### Gateway Redirect (src/gateway/gateway.ts)
```typescript
if (!apiKey) {
  console.error('🚫 Gateway - API Key Missing:', JSON.stringify({
    success: false,
    error: 'Unauthorized',
    message: 'API key required',
    ip: req.ip,
    path: req.path,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  return res.redirect(301, 'https://packmovego.com');
}
```

## Logging

### Server Logs (Direct Access)
```json
{
  "success": false,
  "message": "Direct server access not allowed",
  "error": "Redirecting to main website",
  "ip": "127.0.0.1",
  "path": "/",
  "timestamp": "2025-10-30T18:30:00.000Z"
}
```

### Gateway Logs (No API Key)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "API key required",
  "ip": "127.0.0.1",
  "path": "/v0/blog",
  "origin": "https://example.com",
  "timestamp": "2025-10-30T18:30:00.000Z"
}
```

### Gateway Logs (Bot Detected)
```json
{
  "success": false,
  "error": "Bot Detected",
  "message": "Bot traffic not allowed",
  "ip": "127.0.0.1",
  "path": "/v0/blog",
  "userAgent": "BadBot/1.0",
  "timestamp": "2025-10-30T18:30:00.000Z"
}
```

## Production Deployment

In production:
- **Server (Port 8080)**: Hidden behind firewall, only gateway can access
- **Gateway (Port 443)**: Public-facing, exposed to internet
- **All unauthorized traffic**: Redirects to `https://packmovego.com`
- **Valid API requests**: Flow through gateway → server → response

## Benefits

1. **Clean User Experience**: Bad traffic always goes to main website
2. **No Error Pages**: Users see packmovego.com instead of error messages
3. **Centralized Logging**: All security events logged with full context
4. **Simple Architecture**: Both services handle their own redirects
5. **Production Ready**: Works in both development and production

---

**Last Updated**: 2025-10-30
**Status**: ✅ Complete - Both ports redirect unauthorized traffic

