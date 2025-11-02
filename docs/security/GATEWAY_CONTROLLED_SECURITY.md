# Gateway-Controlled Security Architecture ✅

## Overview

Your security architecture ensures **all unauthorized traffic redirects to packmovego.com**:
- **Gateway**: Handles API key validation, Arcjet protection, and redirects
- **Server**: Detects direct access (missing gateway header) and redirects
- **Result**: Both `localhost:3001` and `localhost:3000` redirect bad traffic

## Architecture Flow

### 1. Direct Server Access (Blocked & Redirected)
```
Client → https://localhost:3001/
       ↓
       Server checks: No X-Gateway-Request header
       ↓
       Server logs: "🚫 Server - Direct Access Blocked"
       ↓
       Server redirects: 301 → https://packmovego.com
```
**Result**: Server detects direct access and redirects to main website.

### 2. Gateway Access WITHOUT API Key
```
Client → https://localhost:3000/
       ↓
       Gateway checks API key: Missing
       ↓
       Gateway logs: "🚫 Gateway - API Key Missing"
       ↓
       Gateway redirects: 301 → https://packmovego.com
```
**Result**: Gateway blocks and redirects immediately.

### 3. Gateway Access WITH Valid API Key
```
Client → https://localhost:3000/
       ↓
       Gateway checks: Arcjet ✅, API Key ✅
       ↓
       Gateway adds: X-Gateway-Request: true
       ↓
       Gateway proxies → Server
       ↓
       Server checks: Has X-Gateway-Request header ✅
       ↓
       Server processes request → Response
```
**Result**: Request flows normally through the gateway to the server.

### 4. Bot/Rate Limit (Arcjet)
```
Bot → https://localhost:3000/
    ↓
    Gateway checks: Arcjet detects bot
    ↓
    Gateway logs: "🚫 Gateway - Bot Detected"
    ↓
    Gateway redirects: 301 → https://packmovego.com
```
**Result**: Gateway blocks and redirects bots/rate-limited requests.

## Logging Responsibilities

### Gateway Logs (All Security Events)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "API key required",
  "ip": "127.0.0.1",
  "path": "/v0/blog",
  "origin": "https://example.com",
  "timestamp": "2025-10-30T18:21:53.180Z"
}
```

**Gateway logs for**:
- ✅ Missing API keys
- ✅ Invalid API keys
- ✅ Bot detection (Arcjet)
- ✅ Rate limiting (Arcjet)
- ✅ Shield protection (Arcjet)

### Server Logs (Implementation Details Only)
```json
{
  "success": false,
  "message": "Direct server access not allowed",
  "error": "Must use gateway",
  "ip": "127.0.0.1",
  "path": "/",
  "timestamp": "2025-10-30T18:21:53.180Z"
}
```

**Server logs for**:
- ✅ Direct access attempts (without gateway header)
- ✅ Business logic errors
- ✅ Database operations
- ✅ Internal application state

## Code Implementation

### Server (`src/server.ts`)
**Role**: Detect direct access and redirect

```typescript
// Block all direct server access (must come from gateway)
app.use((req, res, next) => {
  const host = req.headers.host || '';
  const isDirectServerAccess = host.includes(':3001') || host.includes(':8080');
  const hasGatewayHeader = req.headers['x-gateway-request'] === 'true';
  
  if (isDirectServerAccess && !hasGatewayHeader) {
    console.error('🚫 Server - Direct Access Blocked:', JSON.stringify({
      success: false,
      message: 'Direct server access not allowed',
      error: 'Redirecting to main website',
      ip: req.ip,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    // Redirect to main website
    return res.redirect(301, 'https://packmovego.com');
  }
  
  next();
});
```

### Gateway (`src/gateway/gateway.ts`)
**Role**: All security checks, logging, and redirects

#### API Key Validation
```typescript
app.use((req, res, next) => {
  // Skip auth for health endpoint only
  if (req.path === '/health') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    console.error('🚫 Gateway - API Key Missing:', JSON.stringify({
      success: false,
      error: 'Unauthorized',
      message: 'API key required',
      ip: req.ip,
      path: req.path,
      origin: req.get('Origin'),
      timestamp: new Date().toISOString()
    }, null, 2));
    
    return res.redirect(301, 'https://packmovego.com');
  }
  
  // Same for invalid API key...
});
```

#### Arcjet Protection
```typescript
app.use(async (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  
  const decision = await aj.protect(req, { requested: 1 });
  
  if (decision.isDenied()) {
    if (decision.reason.isBot()) {
      console.error('🚫 Gateway - Bot Detected:', JSON.stringify({
        success: false,
        error: 'Bot Detected',
        message: 'Bot traffic not allowed',
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      }, null, 2));
      
      return res.redirect(301, 'https://packmovego.com');
    }
    
    // Same for rate limit, etc...
  }
  
  next();
});
```

## Test Results

```bash
✅ Test 1: Direct server access (3001)
   Result: 301 Redirect to packmovego.com
   Reason: Server detects no gateway header

✅ Test 2: Gateway with valid API key (3000)
   Result: 200 OK (request flows normally)
   Reason: Gateway allows, server processes

✅ Test 3: Gateway without API key (3000)
   Result: 301 Redirect to packmovego.com
   Reason: Gateway blocks and redirects

✅ Test 4: Bot/Rate limit (3000)
   Result: 301 Redirect to packmovego.com
   Reason: Gateway (Arcjet) blocks and redirects
```

## Key Principles

1. **Single Point of Control**: Gateway makes ALL security decisions
2. **Clear Logging**: Gateway logs ALL security events with full context
3. **Simple Server**: Server just checks gateway header, no complex security logic
4. **Consistent UX**: All bad requests redirect to `packmovego.com`

## Production Deployment

### Gateway (Public - Port 443/3000)
- ✅ Exposed to internet
- ✅ Handles all security
- ✅ Logs all security events
- ✅ Redirects bad traffic

### Server (Private - Port 8080/3001)
- ✅ Hidden behind gateway
- ✅ Simple 403 for unauthorized
- ✅ Logs implementation details only
- ✅ Trusts gateway completely

## Benefits

1. **Centralized Security**: All security logic in one place (gateway)
2. **Easy Monitoring**: All security logs come from gateway
3. **Simple Server**: Server focuses on business logic only
4. **Consistent UX**: All failures redirect to main website
5. **Scalable**: Gateway can be scaled independently

---

**Last Updated**: 2025-10-30
**Architecture**: Gateway-Controlled Security (v3.0)

