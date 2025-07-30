# 🚀 PackMoveGO API Routes Documentation

## 📍 Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://api.packmovego.com`

> **Note**: All routes below are relative to the base URL. For example, `/auth/login` becomes `https://api.packmovego.com/auth/login`

---

## 🔐 Authentication Routes (`/auth`)

### JWT Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/login` | Login user and get JWT token | ❌ |
| `POST` | `/auth/register` | Register new user | ❌ |
| `POST` | `/auth/logout` | Logout and clear token | ❌ |
| `GET` | `/auth/me` | Get current user info | ✅ |
| `POST` | `/auth/refresh` | Refresh JWT token | ❌ |
| `GET` | `/auth/verify` | Verify token validity | ❌ |
| `GET` | `/auth/admin` | Admin-only endpoint | ✅ (Admin) |

---

## 📊 Analytics Routes (`/analytics`)

### Performance & Health Monitoring
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/analytics/performance` | Get performance metrics | ❌ |
| `GET` | `/analytics/health` | Get system health data | ❌ |
| `GET` | `/analytics/export` | Export analytics data | ❌ |
| `GET` | `/analytics/realtime` | Get real-time analytics | ❌ |

---

## 🔧 SSH Management Routes (`/ssh`)

### SSH Server Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/ssh/status` | Get SSH server status | ✅ |
| `GET` | `/ssh/config` | Get SSH configuration | ✅ |
| `POST` | `/ssh/disconnect/:sessionId` | Disconnect specific session | ✅ |
| `POST` | `/ssh/disconnect-all` | Disconnect all sessions | ✅ |
| `GET` | `/ssh/instructions` | Get connection instructions | ✅ |

---

## 🚀 Services Routes (`/v1/services`)

### Enhanced Services API
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/v1/services` | Get all services | ❌ |
| `GET` | `/v1/services/analytics` | Get service analytics | ❌ |
| `GET` | `/v1/services/:serviceId` | Get service by ID | ❌ |
| `POST` | `/v1/services/:serviceId/quote` | Generate service quote | ❌ |

---

## 📝 Prelaunch Routes (`/prelaunch`)

### Early Access & Registration
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/prelaunch/register` | Register for early access | ❌ |
| `GET` | `/prelaunch/subscribers` | Get all subscribers | ❌ |
| `GET` | `/prelaunch/early_subscribers` | Get early subscribers | ❌ |

---

## 🔒 Security Routes (`/security`)

### Security & Validation
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/security/verify-sections` | Verify security sections | ❌ |

---

## 📋 Section Routes (`/sections`)

### Content Sections
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/sections/verify-sections` | Verify section content | ❌ |

---

## 📊 Data Routes (`/data`)

### Dynamic Data Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/data/:name` | Get data file by name | ❌ |

---

## 📄 Content Routes (`/v0/*`)

### Static Content Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/v0/blog` | Get blog content | ❌ |
| `GET` | `/v0/about` | Get about page content | ❌ |
| `GET` | `/v0/nav` | Get navigation data | ❌ |
| `GET` | `/v0/contact` | Get contact information | ❌ |
| `GET` | `/v0/referral` | Get referral data | ❌ |
| `GET` | `/v0/reviews` | Get customer reviews | ❌ |
| `GET` | `/v0/locations` | Get location data | ❌ |
| `GET` | `/v0/supplies` | Get supplies data | ❌ |
| `GET` | `/v0/services` | Get services data | ❌ |
| `GET` | `/v0/testimonials` | Get testimonials | ❌ |

---

## 👤 User Routes (`/signup`)

### User Registration
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/signup/signup` | User registration | ❌ |

---

## 🔗 Webhook Routes (`/webhooks`)

### Webhook Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/webhooks/incoming` | Handle incoming webhooks | ❌ |
| `GET` | `/webhooks/config` | Get webhook configuration | ❌ |
| `POST` | `/webhooks/test` | Test webhook endpoint | ❌ |

---

## 👑 Admin Routes (`/admin`)

### Administrative Functions
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/admin/overview` | Get admin overview | ✅ (Admin) |
| `DELETE` | `/admin/cache/clear` | Clear all cache | ✅ (Admin) |
| `DELETE` | `/admin/cache/pattern/:pattern` | Clear cache by pattern | ✅ (Admin) |
| `POST` | `/admin/security/block-ip` | Block IP address | ✅ (Admin) |
| `POST` | `/admin/security/unblock-ip` | Unblock IP address | ✅ (Admin) |
| `POST` | `/admin/backup/create` | Create system backup | ✅ (Admin) |
| `GET` | `/admin/backup/list` | List backups | ✅ (Admin) |
| `GET` | `/admin/backup/download/:filename` | Download backup | ✅ (Admin) |
| `POST` | `/admin/system/restart` | Restart system | ✅ (Admin) |
| `GET` | `/admin/system/logs` | Get system logs | ✅ (Admin) |

---

## 🌐 Private Network Routes (`/internal`)

### Internal Network Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/internal/health` | Internal health check | ❌ |
| `GET` | `/internal/services` | List internal services | ❌ |
| `POST` | `/internal/services/register` | Register service | ❌ |
| `GET` | `/internal/services/:serviceName` | Get service info | ❌ |
| `GET` | `/internal/discovery/:serviceName?` | Service discovery | ❌ |
| `POST` | `/internal/services/url` | Create service URL | ❌ |
| `GET` | `/internal/privatelink/status` | Private link status | ❌ |
| `POST` | `/internal/privatelink/connect/:awsService` | Connect to AWS service | ❌ |
| `POST` | `/internal/privatelink/test/:awsService` | Test AWS connection | ❌ |
| `GET` | `/internal/privatelink/services/:awsService?` | List AWS services | ❌ |
| `PUT` | `/internal/privatelink/config` | Update private link config | ❌ |
| `POST` | `/internal/validate/port` | Validate port | ❌ |
| `GET` | `/internal/config` | Get internal config | ❌ |

---

## 🏥 Health & Status Routes

### System Health
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | API health check | ❌ |
| `GET` | `/` | API root information | ❌ |

---

## 🔌 Socket.IO Endpoints

### Real-time Communication
| Event | Description | Auth Required |
|-------|-------------|---------------|
| `connection` | Socket connection | ✅ |
| `join-room` | Join a room | ✅ |
| `leave-room` | Leave a room | ✅ |
| `send-message` | Send message to room | ✅ |
| `typing` | Typing indicator | ✅ |
| `disconnect` | Socket disconnection | ✅ |

---

## 🌐 CORS Configuration

### Allowed Origins
- `https://www.packmovego.com`
- `https://packmovego.com`
- `https://api.packmovego.com`
- `http://localhost:3000` (Development)
- `http://localhost:5173` (Development)
- `https://*.vercel.app` (Vercel deployments)
- `https://*.netlify.app` (Netlify deployments)

### CORS Headers
- **Methods**: GET, POST, PUT, DELETE, OPTIONS, HEAD
- **Headers**: Content-Type, Authorization, x-api-key, X-Requested-With, Accept, Origin
- **Credentials**: true (for JWT cookies)
- **Preflight**: Enabled

---

## 📋 Authentication Levels

- **❌ No Auth**: Public endpoints, no authentication required
- **✅ Auth Required**: JWT token required in Authorization header or cookie
- **✅ (Admin)**: Admin role required in addition to authentication

---

## 🔧 Usage Examples

### Authentication
```bash
# Login
curl -X POST https://api.packmovego.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@packmovego.com","password":"demo123"}'

# Get user info (with token)
curl -X GET https://api.packmovego.com/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Content Data
```bash
# Get navigation data
curl https://api.packmovego.com/data/nav

# Get blog content
curl https://api.packmovego.com/v0/blog

# Get services data
curl https://api.packmovego.com/v0/services
```

### Health Check
```bash
# Check API health
curl https://api.packmovego.com/health

# Get API information
curl https://api.packmovego.com/
```

---

## 🎯 Total Route Count

- **Authentication Routes**: 7 endpoints
- **Analytics Routes**: 4 endpoints
- **SSH Routes**: 5 endpoints
- **Services Routes**: 4 endpoints
- **Prelaunch Routes**: 3 endpoints
- **Security Routes**: 1 endpoint
- **Section Routes**: 1 endpoint
- **Data Routes**: 1 endpoint
- **Content Routes**: 10 endpoints
- **User Routes**: 1 endpoint
- **Webhook Routes**: 3 endpoints
- **Admin Routes**: 10 endpoints
- **Private Network Routes**: 13 endpoints
- **Health Routes**: 2 endpoints

**Total: 65 API endpoints** + Socket.IO real-time events

### ✅ **Fixed Issues**
- **v0 Routes**: All content endpoints (`/v0/nav`, `/v0/blog`, `/v0/about`, `/v0/contact`, `/v0/services`, etc.) are now working correctly
- **Missing Route Mounting**: Added `app.use('/v0', v0Routes)` to server.ts
- **Data Format**: Converted `about.txt` to `about.json` for proper API response

---

## ✅ **Current Status**

### Working Endpoints ✅
- **Health**: `/health` - ✅ Working
- **Authentication**: `/auth/*` - ✅ Working  
- **Data**: `/data/*` - ✅ Working
- **Root**: `/` - ✅ Working

### Partially Working Endpoints ⚠️
- **Services**: `/v1/services` - ⚠️ Data loading issue

### Working Endpoints ✅
- **Content**: `/v0/*` - ✅ Working (nav, blog, about, contact, services, etc.)

### CORS Configuration ✅
- **Frontend**: `https://packmovego.com` - ✅ Allowed
- **API**: `https://api.packmovego.com` - ✅ Allowed
- **Development**: `http://localhost:3000` - ✅ Allowed
- **Vercel**: `https://*.vercel.app` - ✅ Allowed

### Socket.IO ✅
- **Real-time**: WebSocket connections - ✅ Working
- **Authentication**: JWT-based - ✅ Working
- **Logging**: Enhanced connection logging - ✅ Working 