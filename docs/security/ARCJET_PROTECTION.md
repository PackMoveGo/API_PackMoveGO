# 🛡️ Arcjet Protection Configuration

## Overview
Arcjet security is now active on the Gateway service, providing multi-layered protection against malicious traffic.

---

## 🔑 Configuration

### Arcjet Key
```
ajkey_01k8ta94w3epb8g52cv9v0kjce
```

### Environment Settings
- **Development:** `ARCJET_ENV=development`
- **Production:** `ARCJET_ENV=production`

---

## 🛡️ Protection Layers

### 1. Shield Protection
- **Mode:** LIVE
- **Purpose:** Protects against common attack patterns
- **Coverage:** All gateway endpoints (except /health, /)

### 2. Bot Detection
- **Mode:** LIVE
- **Allowed Bots:**
  - Vercel monitoring
  - Uptime monitors
  - Postman (for testing)
- **Blocked:** All other automated traffic
- **Response:** `403 Forbidden - Bot traffic not allowed`

### 3. Rate Limiting (Token Bucket)
- **Algorithm:** Token Bucket
- **Mode:** LIVE
- **Refill Rate:** 5 tokens per 10 seconds
- **Bucket Capacity:** 10 tokens
- **Per:** IP address (`ip.src`)
- **Response:** `429 Too Many Requests`

### 4. API Key Authentication
- **Type:** Custom header validation
- **Header:** `x-api-key`
- **Key:** `pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6`
- **Response:** `401 Unauthorized - Valid API key required`

---

## 🔄 Middleware Order

The gateway applies protections in this order:

1. **Helmet** - Security headers
2. **Compression** - Response compression
3. **HTTPS Enforcement** - Redirect HTTP to HTTPS
4. **CORS** - Cross-origin resource sharing
5. **Arcjet Protection** ← Bot detection, rate limiting, shield
6. **API Key Authentication** ← Custom validation
7. **Request Logging** - Log all requests
8. **Proxy Forwarding** - Forward to private server

---

## 📊 Response Codes

| Code | Reason | Message |
|------|--------|---------|
| 200 | Success | Request allowed |
| 401 | No API Key | Valid API key required |
| 403 | Bot Detected | Bot traffic not allowed |
| 403 | Shield Block | Access denied |
| 429 | Rate Limit | Too many requests. Please try again later. |
| 502 | Proxy Error | Unable to connect to private API service |

---

## 🧪 Testing Arcjet Protection

### Test 1: Normal Request (Should Work)
```bash
curl -k -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://localhost:3000/v0/blog
```

### Test 2: Without API Key (Should Fail - 401)
```bash
curl -k https://localhost:3000/v0/blog
```

### Test 3: Rate Limit (Should Fail After 10 Requests - 429)
```bash
for i in {1..15}; do
  curl -k -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
    https://localhost:3000/v0/blog
  echo "Request $i"
  sleep 0.5
done
```

### Test 4: Bot User-Agent (May Be Blocked - 403)
```bash
curl -k -A "Mozilla/5.0 (compatible; Googlebot/2.1)" \
  -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://localhost:3000/v0/blog
```

---

## 🔧 Configuration Files

### Environment Variables
```bash
# Development (.env.development.local)
ARCJET_KEY=ajkey_01k8ta94w3epb8g52cv9v0kjce
ARCJET_ENV=development

# Production (.env.production.local)
ARCJET_KEY=ajkey_01k8ta94w3epb8g52cv9v0kjce
ARCJET_ENV=production
```

### Arcjet Config (`config/arcjet.ts`)
```typescript
import arcjet, {shield, detectBot, tokenBucket} from "@arcjet/node";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ["ip.src"],
  rules: [
    shield({mode: "LIVE"}),
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:VERCEL",
        "CATEGORY:MONITOR",
        "POSTMAN"
      ]
    }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 5,
      interval: 10,
      capacity: 10
    })
  ]
});
```

### Gateway Implementation (`src/gateway/gateway.ts`)
```typescript
// Arcjet protection middleware
app.use(async (req, res, next) => {
  if(req.path==='/health' || req.path==='/') {
    return next();
  }
  
  try {
    const decision = await aj.protect(req, {requested: 1});
    
    if(decision.isDenied()) {
      if(decision.reason.isRateLimit()) {
        return res.status(429).json({
          success: false,
          error: 'Rate Limit Exceeded',
          message: 'Too many requests. Please try again later.'
        });
      }
      
      if(decision.reason.isBot()) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Bot traffic not allowed'
        });
      }
      
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied'
      });
    }
    
    next();
  } catch(error) {
    // Don't block on errors in development
    if(config.NODE_ENV === 'development') {
      next();
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal Server Error'
      });
    }
  }
});
```

---

## 📈 Monitoring

### Arcjet Dashboard
Visit [Arcjet Dashboard](https://app.arcjet.com) to monitor:
- Request patterns
- Blocked traffic
- Rate limit violations
- Bot detection events

### Local Logs
Gateway logs will show:
- `Rate limit exceeded from {IP}`
- `Bot detected from {IP}`
- `Access denied from {IP}`

---

## ⚙️ Customization

### Adjust Rate Limits
Edit `config/arcjet.ts`:
```typescript
tokenBucket({
  mode: "LIVE",
  refillRate: 10,    // Change: tokens per interval
  interval: 10,      // Change: seconds
  capacity: 20       // Change: max burst
})
```

### Allow More Bots
Edit `config/arcjet.ts`:
```typescript
detectBot({
  mode: "LIVE",
  allow: [
    "CATEGORY:VERCEL",
    "CATEGORY:MONITOR",
    "POSTMAN",
    "CATEGORY:PREVIEW",  // Add: Link previews (Slack, Discord)
    "CATEGORY:SEARCH"    // Add: Search engines
  ]
})
```

### Test Mode (Dry Run)
Change mode to "DRY_RUN" to log without blocking:
```typescript
shield({mode: "DRY_RUN"})
detectBot({mode: "DRY_RUN", ...})
tokenBucket({mode: "DRY_RUN", ...})
```

---

## 🚨 Troubleshooting

### Issue: Legitimate traffic being blocked
**Solution:** Check Arcjet dashboard to see the block reason. Adjust rules or add to allow list.

### Issue: Rate limits too strict
**Solution:** Increase `refillRate` or `capacity` in `tokenBucket` configuration.

### Issue: Development testing blocked
**Solution:** Either:
1. Add Postman/curl to allow list
2. Set `mode: "DRY_RUN"` temporarily
3. Use health endpoint (`/health`) which bypasses all protection

---

## ✅ Status Check

All protection layers are now active on:
- **Gateway:** `https://localhost:3000`
- **Environment:** Development
- **Arcjet Key:** Configured ✅
- **Bot Detection:** LIVE ✅
- **Rate Limiting:** LIVE ✅
- **Shield:** LIVE ✅
- **API Key Auth:** LIVE ✅

---

*Last Updated: October 30, 2025*

