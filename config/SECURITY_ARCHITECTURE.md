# 🔒 Security Architecture

## Dual-Layer Security System

Your PackMoveGO backend uses a **dual-layer security architecture** with clearly separated responsibilities:

### Layer 1: Gateway (`localhost:3000`) - Public Facing

**Purpose:** First line of defense - validates ALL incoming requests

**Security Measures:**
- ✅ **Arcjet Protection** (Bot Detection, Rate Limiting, Shield)
- ✅ **API Key Validation** (Frontend/Admin keys)
- ✅ **HTTPS/SSL** encryption
- ✅ **CORS** configuration

**Configuration:**
- API keys: `API_KEY_FRONTEND`, `API_KEY_ADMIN`
- Arcjet key: `ARCJET_KEY=ajkey_01k8ta94w3epb8g52cv9v0kjce`
- API key check: **ENABLED** on gateway

**Behavior:**
- ❌ **No API Key** → 401 Unauthorized
- ❌ **Invalid API Key** → 401 Unauthorized
- ❌ **Bot Detected** → 403 Forbidden
- ❌ **Rate Limit Exceeded** → 429 Too Many Requests
- ✅ **Valid API Key** → Proxy to server

---

### Layer 2: Server (`localhost:3001`) - Private

**Purpose:** Trusts requests from gateway, focuses on business logic

**Security Measures:**
- ✅ **JWT Authentication** (for user sessions)
- ✅ **MongoDB Authentication**
- ✅ **HTTPS/SSL** encryption
- ✅ **Input Validation**
- ✅ **Direct Access Prevention** (redirects to gateway)
- ⚠️ **No API Key Validation** (trusts gateway)

**Configuration:**
- API key check: **DISABLED** (`API_KEY_ENABLED=false`)
- Direct access: **BLOCKED** (automatically redirects to gateway)
- Special header: `X-Gateway-Request: true` (identifies gateway requests)
- Only accessible via gateway proxy (not directly exposed in production)

**Behavior:**
- ✅ **Request from Gateway** → Processed (has `X-Gateway-Request` header)
- ❌ **Direct Server Access** → HTTP 301 redirect to gateway
- 🔒 **Security:** All traffic MUST go through gateway

---

## Request Flow

### ✅ Valid Request (Through Gateway)
```
Frontend → Gateway (validates API key + Arcjet) 
        ↓
        Adds X-Gateway-Request: true header
        ↓
        Server (accepts request with gateway header) → Response
```

### ❌ Direct Server Access (Bypassing Gateway)
```
Client → Server (no X-Gateway-Request header)
       ↓
       HTTP 301 Redirect → Gateway
```

### ❌ No API Key
```
Frontend → Gateway → 301 Redirect to https://packmovego.com
```

### ❌ Invalid API Key
```
Frontend → Gateway → 301 Redirect to https://packmovego.com
```

### ❌ Bot Traffic
```
Bot → Gateway → 301 Redirect to https://packmovego.com
```

### ❌ Rate Limit Exceeded
```
Client → Gateway → 301 Redirect to https://packmovego.com
```

---

## Why This Architecture?

### Single Point of Security Enforcement
- **Gateway validates once** - server doesn't duplicate checks
- **Reduced complexity** - server focuses on business logic
- **Better performance** - fewer validation steps

### Defense in Depth
- **Multiple protection layers** (Arcjet, API keys, JWT, SSL)
- **Separated concerns** (security at gateway, logic at server)
- **Fail-safe defaults** (deny by default, allow explicitly)

### Scalability
- **Gateway can be scaled** independently of server
- **Server can be private** (not exposed to internet directly in production)
- **Easy to add more gateways** for load balancing

### Forced Gateway Entry Point
- **Server automatically redirects** all direct access attempts to gateway
- **X-Gateway-Request header** identifies legitimate gateway traffic
- **Impossible to bypass** the gateway security layer
- **Production-ready** for both development and production environments

---

## API Keys

### Frontend Key
```
pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
```
- Use this in your frontend application
- Required for all API requests through the gateway
- Send in `x-api-key` header or `Authorization: Bearer <key>` header

### Admin Key
```
pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4
```
- Use this for admin operations
- Higher privileges than frontend key
- Send in `x-api-key` header or `Authorization: Bearer <key>` header

---

## Example Requests

### Valid Request (JavaScript/Fetch)
```javascript
fetch('https://localhost:3000/v0/blog', {
  headers: {
    'x-api-key': 'pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6'
  }
})
```

### Valid Request (curl)
```bash
curl -k -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://localhost:3000/v0/blog
```

### Invalid Request (No API Key)
```bash
curl -k https://localhost:3000/v0/blog
# Response: {"success":false,"error":"Unauthorized","message":"Valid API key required"}
```

---

## Testing Security

Run these commands to verify your security setup:

```bash
# Test 1: Direct server access (should redirect to gateway)
curl -k -I https://localhost:3001/
# Expected: HTTP 301 Redirect to https://localhost:3000/

# Test 2: Direct server /health access (should redirect to gateway)
curl -k -I https://localhost:3001/health
# Expected: HTTP 301 Redirect to https://localhost:3000/health

# Test 3: Gateway health check (public, no API key needed)
curl -k https://localhost:3000/health
# Expected: {"status":"ok","service":"gateway",...}

# Test 4: Gateway without API key (should redirect to main site)
curl -k https://localhost:3000/v0/blog
# Expected: HTTP 301 Redirect to https://packmovego.com

# Test 5: Gateway with invalid API key (should redirect to main site)
curl -k -H "x-api-key: invalid_key" https://localhost:3000/v0/blog
# Expected: HTTP 301 Redirect to https://packmovego.com

# Test 6: Gateway with valid API key (should work)
curl -k -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://localhost:3000/v0/blog
# Expected: Success response
```

---

## Environment Configuration

### Development (`.env.development.local`)
```bash
# Gateway Settings
GATEWAY_PORT=3000
API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
API_KEY_ADMIN=pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4
ARCJET_KEY=ajkey_01k8ta94w3epb8g52cv9v0kjce
ARCJET_ENV=development

# Server Settings  
PORT=3001
PRIVATE_API_URL=https://localhost:3001
API_KEY_ENABLED=false  # Server trusts gateway
```

### Production (`.env.production.local`)
```bash
# Gateway Settings
GATEWAY_PORT=3000
API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
API_KEY_ADMIN=pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4
ARCJET_KEY=ajkey_01k8ta94w3epb8g52cv9v0kjce
ARCJET_ENV=production

# Server Settings
PORT=3001
PRIVATE_API_URL=https://your-server-url.com
API_KEY_ENABLED=false  # Server trusts gateway
```

---

## Arcjet Configuration

Located in: `/config/arcjet.ts`

**Protection Rules:**
1. **Shield** - Protects against common web attacks (SQL injection, XSS, etc.)
2. **Bot Detection** - Blocks malicious bots, allows legitimate tools (curl, Postman)
3. **Rate Limiting** - 5 requests per 10 seconds per IP (token bucket algorithm)

**Allowed Bots:**
- `CURL` - For testing
- `POSTMAN` - For API development
- `CATEGORY:VERCEL` - For deployment
- `CATEGORY:MONITOR` - For monitoring services

---

## Production Deployment

### Gateway Deployment
- **Expose:** Port 3000 to the internet
- **Environment:** Set `ARCJET_ENV=production`
- **SSL:** Use production certificates
- **CORS:** Configure production domains only

### Server Deployment  
- **Expose:** Keep private (only gateway can access)
- **Environment:** Set `API_KEY_ENABLED=false`
- **SSL:** Use production certificates (for gateway-to-server communication)
- **Database:** Use production MongoDB connection string

### Deployment Checklist
- [ ] Update API keys to production values
- [ ] Set `ARCJET_ENV=production`
- [ ] Configure production SSL certificates
- [ ] Set correct `PRIVATE_API_URL` for gateway
- [ ] Update CORS origins to production domains only
- [ ] Remove development domains from `ALLOWED_DOMAINS`
- [ ] Verify MongoDB connection string
- [ ] Test all security layers
- [ ] Monitor Arcjet dashboard

---

## Security Best Practices

### ✅ DO
- Always use HTTPS in production
- Rotate API keys regularly
- Monitor Arcjet dashboard for threats
- Keep rate limits appropriate for your traffic
- Log all security events
- Use strong MongoDB credentials
- Keep SSL certificates up to date

### ❌ DON'T
- Never expose the server port directly to the internet
- Never commit API keys to version control
- Never disable SSL in production
- Never allow API keys in URL parameters
- Never log full API keys (mask them)
- Never use the same keys for dev and production

---

## Troubleshooting

### Gateway Returns 401
- **Check:** API key is being sent in `x-api-key` header
- **Check:** API key matches exactly (no extra spaces)
- **Check:** Gateway environment has correct `API_KEY_FRONTEND` value

### Gateway Returns 403  
- **Check:** Arcjet might be blocking your IP or user agent
- **Check:** Rate limit might be exceeded (wait 10 seconds)
- **Check:** Request might look like a bot

### Gateway Returns 429
- **Cause:** Rate limit exceeded (5 requests per 10 seconds)
- **Solution:** Wait 10 seconds and try again
- **Production:** Consider increasing rate limits in `config/arcjet.ts`

### Server Redirects to packmovego.com
- **Cause:** Direct access to server without going through gateway
- **Solution:** Always use the gateway URL (`localhost:3000`)
- **Note:** This is expected behavior for direct server access

---

## Monitoring & Logging

### Gateway Logs
- API key validation attempts
- Arcjet protection decisions
- Proxy requests to server
- Response times

### Server Logs  
- Business logic errors
- Database operations
- JWT authentication
- API key violations (with redirect to main website)

### Arcjet Dashboard
- Real-time threat detection
- Rate limit metrics
- Bot detection statistics
- Shield protection events

**Access:** https://app.arcjet.com

---

**Last Updated:** 2025-10-30
**Architecture Version:** 2.0 (Dual-Layer with Arcjet)

