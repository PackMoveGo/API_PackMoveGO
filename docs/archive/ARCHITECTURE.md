# PackMoveGO API Architecture

## Overview

PackMoveGO uses a **dual-server architecture** designed for security, scalability, and separation of concerns.

## Architecture Diagram

```
Frontend (React)
    |
    | x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
    ↓
┌─────────────────────────────────────────┐
│   Gateway Service (Port 4000)           │
│   - Public-facing                       │
│   - API Key validation                  │
│   - HTTPS enforcement                   │
│   - Rate limiting                       │
│   - Security headers (Helmet.js)        │
│   - CORS validation                     │
│   - Request logging                     │
└─────────────────────────────────────────┘
    |
    | HTTP Proxy
    ↓
┌─────────────────────────────────────────┐
│   Server Service (Port 3000)            │
│   - Private (not public)                │
│   - Business logic                      │
│   - Database operations                 │
│   - JWT authentication                  │
│   - Arcjet protection                   │
│   - API routes                          │
│   - Socket.IO                           │
└─────────────────────────────────────────┘
    |
    ↓
┌─────────────────────────────────────────┐
│   MongoDB Database                       │
│   - User data                           │
│   - Subscriptions                       │
│   - Bookings                            │
│   - Services                            │
└─────────────────────────────────────────┘
```

## Components

### 1. Gateway Service

**File**: `src/gateway/gateway.ts`

**Responsibilities**:
- First point of contact for all frontend requests
- Validates frontend API key before proxying
- Enforces HTTPS for production domains
- Adds security headers (Helmet.js)
- Implements CORS policies
- Proxies authenticated requests to private server

**Key Middleware**:
```typescript
// API Key validation
const FRONTEND_API_KEY=config.API_KEY_FRONTEND;
// Validates x-api-key or Authorization header

// HTTPS enforcement
// Blocks HTTP requests to api.packmovego.com

// Proxy configuration
// Forwards to PRIVATE_API_URL (http://localhost:3000)
```

**Endpoints**:
- `GET /health` - Gateway health check (no auth required)
- `GET /` - Gateway info (no auth required)
- `/*` - All other routes proxied to server (auth required)

### 2. Server Service

**File**: `src/server.ts`

**Responsibilities**:
- Handles all business logic
- Manages database operations
- User authentication (JWT)
- Real-time features (Socket.IO)
- Third-party integrations (Stripe, Email)
- Subscription workflows (Upstash)

**Key Routes**:
- `/auth/*` - Authentication endpoints
- `/v0/*` - Content endpoints (blog, nav, services, etc.)
- `/v1/services/*` - Enhanced services API
- `/v1/subscriptions/*` - Subscription management (Arcjet protected)
- `/v1/workflows/*` - Workflow endpoints (Arcjet protected)
- `/data/*` - Dynamic data endpoints
- `/analytics/*` - Analytics endpoints
- `/ssh/*` - SSH management
- `/internal/*` - Private network routes

**Key Middleware Stack** (Order matters):
1. Security middleware (Helmet, compression)
2. Performance monitoring
3. Rate limiting (advancedRateLimiter, burstProtection)
4. CORS configuration
5. Load balancer middleware
6. Request logging with user tracking
7. Cookie parser
8. JSON/URL-encoded body parser
9. Request timeout (30s)
10. Optional JWT authentication

### 3. Database Layer

**Connection**: `src/database/mongodb-connection.ts`

**Models**:
- `userModel.ts` - User accounts and authentication
- `userModel-alt.ts` - Alternative user schema
- `subscriptionModel.ts` - Subscription management
- `bookingModel.ts` - Booking management

**Static Data**: `src/database/*.json`
- Navigation, blog, services, testimonials, etc.

### 4. Real-time Communication

**Socket.IO** on Server:
- User tracking
- Admin channels
- Live chat functionality
- Real-time updates

**Authentication**: JWT-based socket authentication

## Request Flow

### Frontend → API

1. **Frontend sends request**:
   ```javascript
   fetch('https://api.packmovego.com/v0/nav', {
     headers: {
       'x-api-key': 'pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6'
     }
   });
   ```

2. **Gateway validates API key**:
   - Checks `x-api-key` or `Authorization` header
   - Returns 401 if invalid/missing
   - Logs request

3. **Gateway proxies to server**:
   - Forwards to `http://localhost:3000/v0/nav`
   - Adds gateway headers (`X-Gateway-Service`)
   - Maintains original request context

4. **Server processes request**:
   - Applies middleware stack
   - Routes to appropriate controller
   - Queries database if needed
   - Returns response

5. **Gateway returns response**:
   - Adds gateway response headers
   - Returns to frontend

## Security Layers

### Layer 1: Gateway (Public Internet)
- ✅ API Key validation
- ✅ HTTPS enforcement
- ✅ CORS validation
- ✅ Rate limiting
- ✅ Security headers

### Layer 2: Server (Private Network)
- ✅ Arcjet protection (Shield, bot detection, rate limiting)
- ✅ JWT authentication
- ✅ Input validation
- ✅ Error handling
- ✅ Database security

## Development vs Production

### Development Mode
```bash
# Both servers run on localhost
npm run dev

# Gateway: http://localhost:3003 (or https if SSL enabled)
# Server: http://localhost:3000
# Frontend: http://localhost:5001
```

**Flow**: Frontend → Gateway (localhost:3003) → Server (localhost:3000)

### Production Mode
```bash
# Built and deployed separately
npm run build
npm start

# Gateway: https://api.packmovego.com (public)
# Server: Internal network only (private)
```

**Flow**: Frontend → Gateway (api.packmovego.com) → Server (internal network)

## Environment Configuration

### Development Environment (.env.development.local)
```env
NODE_ENV=development
PORT=3000
GATEWAY_PORT=3003
LOCAL_NETWORK=localhost
PRIVATE_API_URL=http://localhost:3000
API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
API_KEY_ADMIN=pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4
API_KEY_ENABLED=true
DEBUG=true
LOG_LEVEL=debug
```

### Production Environment (.env.production.local)
```env
NODE_ENV=production
PORT=10000
GATEWAY_PORT=443
PRIVATE_API_URL=http://localhost:10000
API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
API_KEY_ADMIN=pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4
API_KEY_ENABLED=true
DEBUG=false
LOG_LEVEL=info
```

### Shared Variables
```env
NODE_ENV=development
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,x-api-key
```

## File Structure

```
SSD/
├── src/
│   ├── gateway/                    # Gateway service
│   │   ├── gateway.ts             # Main gateway file
│   │   └── gateway-entry.js       # Entry point
│   │
│   ├── server.ts                  # Main server file
│   ├── server-entry.ts            # Server entry point
│   │
│   ├── routes/                    # API routes
│   │   ├── authRoutes.ts
│   │   ├── authRoutes-alt.ts      # Arcjet protected auth
│   │   ├── servicesRoutes.ts
│   │   ├── subscriptionRoutes.ts  # Subscription management
│   │   ├── workflowRoutes.ts      # Upstash workflows
│   │   ├── v0-routes.ts          # Content routes
│   │   └── ... (23 route files)
│   │
│   ├── middlewares/               # Middleware
│   │   ├── security.ts           # Security middleware
│   │   ├── authMiddleware.ts     # JWT auth
│   │   ├── arcjet-middleware.ts  # Arcjet protection
│   │   ├── cors-jwt.ts           # CORS + JWT
│   │   ├── error-handler.ts      # Error handling
│   │   └── ...
│   │
│   ├── controllers/               # Business logic
│   │   ├── authController.ts
│   │   ├── subscriptionController.ts
│   │   ├── servicesController.ts
│   │   └── ...
│   │
│   ├── models/                    # Database models
│   │   ├── userModel.ts
│   │   ├── subscriptionModel.ts
│   │   ├── bookingModel.ts
│   │   └── ...
│   │
│   ├── util/                      # Utilities
│   │   ├── console-logger.ts     # Logging
│   │   ├── socket-utils.ts       # Socket.IO
│   │   ├── jwt-utils.ts          # JWT helpers
│   │   ├── api-limiter.ts        # Rate limiting
│   │   └── ...
│   │
│   └── database/                  # Static data
│       ├── nav.json
│       ├── services.json
│       └── ...
│
├── config/                        # Configuration
│   ├── env-loader.ts             # Environment loader
│   ├── arcjet.ts                 # Arcjet config
│   ├── upstash.ts                # Upstash config
│   └── database.ts               # Database config
│
└── package.json                   # Dependencies & scripts
```

## Port Configuration

### Development Environment
| Service | Port | Accessibility | Purpose |
|---------|------|---------------|---------|
| Gateway | 3003 | Public | Frontend entry point |
| Server | 3000 | Private | Business logic |
| Frontend | 5001 | Public | User interface |

### Production Environment
| Service | Port | Accessibility | Purpose |
|---------|------|---------------|---------|
| Gateway | 443 (HTTPS) | Public | Frontend entry point |
| Server | 10000 | Private | Business logic |
| Frontend | 443 (HTTPS) | Public | User interface |

## Deployment Strategy

### Option 1: Single Server Deployment
- Deploy both gateway and server on same machine
- Gateway on `0.0.0.0:4000`
- Server on `127.0.0.1:3000` (localhost only)
- Firewall blocks port 3000 from public

### Option 2: Multi-Server Deployment
- Deploy gateway on public server (exposed to internet)
- Deploy server on private subnet
- Configure internal networking/VPN
- Gateway proxies to server via private IP

### Recommended Production Setup
```yaml
# Render.yaml example
services:
  - type: web
    name: packmovego-gateway
    env: node
    buildCommand: npm run build:gateway
    startCommand: npm run start:gateway
    envVars:
      - key: NODE_ENV
        value: production
      - key: API_KEY_FRONTEND
        sync: false  # Set in Render dashboard
      
  - type: private
    name: packmovego-server
    env: node
    buildCommand: npm run build:server
    startCommand: npm run start:server
    envVars:
      - key: SERVICE_TYPE
        value: private
```

## Testing

### Test Gateway
```bash
# Without API key (should fail with 401)
curl http://localhost:3003/v0/nav

# With API key (should succeed)
curl -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  http://localhost:3003/v0/nav

# Health endpoint (no auth required)
curl http://localhost:3003/health
```

### Test Server Directly (Development Only)
```bash
# Server should be accessible in development
curl http://localhost:3000/health
```

### Test Full Flow
```bash
# Start both services
npm run dev

# Test gateway → server proxy
curl -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  http://localhost:3003/v0/services

# Test with Authorization header
curl -H "Authorization: Bearer pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  http://localhost:3003/data/nav
```

## Troubleshooting

### Gateway can't connect to server
- Check `PRIVATE_API_URL` in `.env`
- Verify server is running on port 3000
- Check firewall rules

### Frontend getting 401 errors
- Verify `API_KEY_FRONTEND` is set correctly
- Check request headers include `x-api-key`
- Ensure API key matches exactly

### CORS errors
- Verify `CORS_ORIGIN` includes frontend domain
- Check request `Origin` header
- Ensure gateway CORS middleware is properly configured

### Import errors on startup
- All middleware imports should use `./middlewares/`
- All route imports should use `./routes/`
- Gateway imports should use `../middlewares/`

## Performance Optimization

- ✅ Compression enabled (gzip)
- ✅ Response caching where appropriate
- ✅ Connection pooling for MongoDB
- ✅ Rate limiting prevents resource exhaustion
- ✅ Request timeout (30s)
- ✅ Performance monitoring middleware

## Monitoring

Both services log comprehensive information:

**Gateway Logs**:
- Request validation (API key checks)
- Proxy operations
- Response times
- Security events

**Server Logs**:
- User tracking
- Database operations
- Business logic events
- Error tracking

## Scaling Strategy

### Horizontal Scaling
1. Deploy multiple gateway instances behind load balancer
2. Deploy multiple server instances
3. Use shared session store (Redis)
4. Configure sticky sessions for Socket.IO

### Vertical Scaling
1. Increase server resources
2. Optimize database queries
3. Implement caching layer
4. Use database read replicas

## Security Considerations

### API Key Rotation
1. Generate new `API_KEY_FRONTEND`
2. Update frontend environment
3. Update gateway configuration
4. Deploy changes simultaneously
5. Monitor for failed authentications

### JWT Secret Rotation
1. Generate new `JWT_SECRET`
2. Implement dual-secret validation period
3. Update all services
4. Invalidate old tokens

### Database Security
- Use connection string with authentication
- Implement IP whitelisting
- Enable audit logging
- Regular backups
- Encrypted connections (TLS)

## Support

For architecture questions: architecture@packmovego.com

