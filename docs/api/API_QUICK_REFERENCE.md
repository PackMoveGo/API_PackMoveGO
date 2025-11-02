# ⚡ PackMoveGO API - Quick Reference

**Base URL:** `https://localhost:3000`  
**API Key:** `pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6`

---

## 🔑 Authentication

```bash
# All requests need this header (except /health):
x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
```

---

## 🚀 Most Common Endpoints

### Health Check (No Auth)
```
GET /health
```

### Authentication
```
POST /v0/auth/login
POST /v0/auth/register
GET /api/auth/status
```

### Content
```
GET /v0/blog
GET /v0/about
GET /v0/nav
GET /v0/services
GET /v0/locations
GET /v0/reviews
```

### Bookings
```
GET /v0/bookings
POST /v0/bookings
GET /v0/bookings/:id
PUT /v0/bookings/:id
DELETE /v0/bookings/:id
```

### Payments
```
GET /v0/payments
POST /v0/payments
```

### Chat
```
GET /v0/chat
POST /v0/chat
GET /v0/chat/:id
```

---

## 📋 Request Examples

### Login
```bash
POST https://localhost:3000/v0/auth/login
Headers:
  x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
  Content-Type: application/json
Body:
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Blog Posts
```bash
GET https://localhost:3000/v0/blog
Headers:
  x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
```

### Create Booking
```bash
POST https://localhost:3000/v0/bookings
Headers:
  x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
  Content-Type: application/json
Body:
{
  "customerName": "John Doe",
  "date": "2025-12-01",
  "service": "local-move"
}
```

---

## ❌ Removed Endpoints

```
❌ /auth/login → Use /v0/auth/login
❌ /auth/register → Use /v0/auth/register
❌ /prelaunch/* → Removed completely
❌ /v1/subscriptions → Use /v0/subscriptions
❌ /v1/workflows → Use /v0/workflows
```

---

## 🛡️ Security

- All requests go through gateway (port 3000)
- Direct server access (port 3001) blocked
- Arcjet protection enabled
- API key required for all endpoints (except /health)

---

## 📖 Full Documentation

- **Complete API Docs:** `POSTMAN_API_ENDPOINTS.md`
- **Security Details:** `SECURITY_ARCHITECTURE.md`
- **Change Summary:** `ROUTE_CLEANUP_SUMMARY.md`
- **System Status:** `SYSTEM_STATUS.md`

