# 📬 PackMoveGO API - Postman Collection

Complete API endpoint reference for testing with Postman.

---

## 🔑 Authentication Setup

### Environment Variables
Create a Postman environment with:
```
Variable: api_key
Value: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
```

### Request Headers
Add to ALL requests (except `/health`):
```
x-api-key: {{api_key}}
```

### SSL Configuration
- **Postman Settings** → **Certificates**
- Turn **OFF** "SSL certificate verification" for localhost testing

---

## 🎯 Base URL

```
https://localhost:3000
```

**Important:** All traffic MUST go through the gateway (port 3000). Direct server access (port 3001) will redirect to `packmovego.com`.

---

## 📋 API Endpoints

### ✅ System & Health

#### Health Check
```http
GET https://localhost:3000/health
```
**Headers:** None required  
**Response:**
```json
{
  "status": "ok",
  "service": "gateway",
  "timestamp": "2025-11-01T...",
  "privateApiUrl": "https://localhost:3001"
}
```

#### Gateway Root
```http
GET https://localhost:3000/
```
**Headers:** `x-api-key: {{api_key}}`  
**Response:**
```json
{
  "message": "PackMoveGO Gateway Service",
  "status": "running",
  "service": "gateway",
  "timestamp": "2025-11-01T...",
  "endpoints": {
    "health": "/health",
    "api": "/api/*",
    "v0": "/v0/*",
    "data": "/data/*"
  }
}
```

---

### 🔐 Authentication (Arcjet Protected)

#### Login
```http
POST https://localhost:3000/v0/auth/login
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Register
```http
POST https://localhost:3000/v0/auth/register
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Auth Status
```http
GET https://localhost:3000/api/auth/status
```
**Headers:** `x-api-key: {{api_key}}`

---

### 📝 Content Endpoints

#### Blog
```http
GET https://localhost:3000/v0/blog
GET https://localhost:3000/v0/blog/:slug
```
**Headers:** `x-api-key: {{api_key}}`

#### About
```http
GET https://localhost:3000/v0/about
```
**Headers:** `x-api-key: {{api_key}}`

#### Navigation
```http
GET https://localhost:3000/v0/nav
```
**Headers:** `x-api-key: {{api_key}}`

#### Contact
```http
GET https://localhost:3000/v0/contact
```
**Headers:** `x-api-key: {{api_key}}`

#### Referral
```http
GET https://localhost:3000/v0/referral
```
**Headers:** `x-api-key: {{api_key}}`

#### Reviews
```http
GET https://localhost:3000/v0/reviews
```
**Headers:** `x-api-key: {{api_key}}`

#### Locations
```http
GET https://localhost:3000/v0/locations
```
**Headers:** `x-api-key: {{api_key}}`

#### Supplies
```http
GET https://localhost:3000/v0/supplies
```
**Headers:** `x-api-key: {{api_key}}`

#### Services
```http
GET https://localhost:3000/v0/services
GET https://localhost:3000/v0/services/:serviceId
POST https://localhost:3000/v0/services/:serviceId/quote
GET https://localhost:3000/v0/services/analytics
```
**Headers:** `x-api-key: {{api_key}}`

#### Testimonials
```http
GET https://localhost:3000/v0/testimonials
```
**Headers:** `x-api-key: {{api_key}}`

---

### 👤 User Management

#### Signup
```http
POST https://localhost:3000/signup
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

---

### 📑 Sections Management

#### Get All Sections
```http
GET https://localhost:3000/sections
```
**Headers:** `x-api-key: {{api_key}}`

#### Create Section
```http
POST https://localhost:3000/sections
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "title": "New Section",
  "content": "Section content here"
}
```

#### Update Section
```http
PUT https://localhost:3000/sections/:id
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "title": "Updated Section",
  "content": "Updated content here"
}
```

#### Delete Section
```http
DELETE https://localhost:3000/sections/:id
```
**Headers:** `x-api-key: {{api_key}}`

---

### 📊 Subscriptions

#### Get All Subscriptions
```http
GET https://localhost:3000/v0/subscriptions
```
**Headers:** `x-api-key: {{api_key}}`

#### Create Subscription
```http
POST https://localhost:3000/v0/subscriptions
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "email": "subscriber@example.com",
  "plan": "premium"
}
```

#### Get Subscription by ID
```http
GET https://localhost:3000/v0/subscriptions/:id
```
**Headers:** `x-api-key: {{api_key}}`

#### Update Subscription
```http
PUT https://localhost:3000/v0/subscriptions/:id
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "plan": "enterprise"
}
```

#### Delete Subscription
```http
DELETE https://localhost:3000/v0/subscriptions/:id
```
**Headers:** `x-api-key: {{api_key}}`

---

### 🔄 Workflows

#### Get All Workflows
```http
GET https://localhost:3000/v0/workflows
```
**Headers:** `x-api-key: {{api_key}}`

#### Create Workflow
```http
POST https://localhost:3000/v0/workflows
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "name": "New Workflow",
  "steps": ["step1", "step2", "step3"]
}
```

---

### 📅 Bookings

#### Get All Bookings
```http
GET https://localhost:3000/v0/bookings
```
**Headers:** `x-api-key: {{api_key}}`

#### Create Booking
```http
POST https://localhost:3000/v0/bookings
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "customerName": "John Doe",
  "date": "2025-12-01",
  "service": "local-move",
  "address": "123 Main St"
}
```

#### Get Booking by ID
```http
GET https://localhost:3000/v0/bookings/:id
```
**Headers:** `x-api-key: {{api_key}}`

#### Update Booking
```http
PUT https://localhost:3000/v0/bookings/:id
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "status": "confirmed",
  "date": "2025-12-02"
}
```

#### Delete Booking
```http
DELETE https://localhost:3000/v0/bookings/:id
```
**Headers:** `x-api-key: {{api_key}}`

---

### 💬 Chat

#### Get Chat History
```http
GET https://localhost:3000/v0/chat
```
**Headers:** `x-api-key: {{api_key}}`

#### Send Chat Message
```http
POST https://localhost:3000/v0/chat
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "message": "Hello, I need help with my move",
  "userId": "user123"
}
```

#### Get Chat by ID
```http
GET https://localhost:3000/v0/chat/:id
```
**Headers:** `x-api-key: {{api_key}}`

---

### 💳 Payments

#### Get Payment History
```http
GET https://localhost:3000/v0/payments
```
**Headers:** `x-api-key: {{api_key}}`

#### Create Payment
```http
POST https://localhost:3000/v0/payments
```
**Headers:** `x-api-key: {{api_key}}`  
**Body (JSON):**
```json
{
  "amount": 15000,
  "currency": "usd",
  "bookingId": "booking123",
  "paymentMethod": "card"
}
```

---

### 📊 Data & Analytics

#### Get Data by Name
```http
GET https://localhost:3000/data/:name
```
**Headers:** `x-api-key: {{api_key}}`

#### Analytics
```http
GET https://localhost:3000/analytics
```
**Headers:** `x-api-key: {{api_key}}`

---

### 🔒 Internal & Load Balancer

#### Internal Routes (Admin Only)
```http
GET https://localhost:3000/internal/*
```
**Headers:** `x-api-key: {{api_key}}` (Admin key required)

#### Load Balancer Status
```http
GET https://localhost:3000/load-balancer/*
```
**Headers:** `x-api-key: {{api_key}}`

---

## ❌ Removed Endpoints

The following endpoints have been **removed** and will no longer work:

### Deprecated Auth Routes (Use `/v0/auth` instead)
```
❌ POST https://localhost:3000/auth/login
❌ POST https://localhost:3000/auth/register
```
**Use instead:** `/v0/auth/login` and `/v0/auth/register`

### Deprecated Prelaunch Routes
```
❌ POST https://localhost:3000/prelaunch
❌ GET https://localhost:3000/prelaunch
```

---

## 🛡️ Security Architecture

### Request Flow
```
Client Request
    ↓
Gateway (localhost:3000)
    ↓
Arcjet Security Check (Bot Detection, Rate Limiting)
    ↓
API Key Validation (x-api-key header)
    ↓
Proxy to Server (localhost:3001)
    ↓
Response
```

### Security Features
- ✅ **Arcjet Protection**: Bot detection, rate limiting, shield
- ✅ **API Key Authentication**: Required for all requests (except `/health`)
- ✅ **CORS**: Configured for specific origins
- ✅ **SSL/HTTPS**: Self-signed certificates for local development
- ✅ **Gateway Header**: `X-Gateway-Request: true` injected by gateway

### Blocked Scenarios
- ❌ Direct server access (port 3001) → Redirects to `packmovego.com`
- ❌ Missing API key → Redirects to `packmovego.com`
- ❌ Invalid API key → Redirects to `packmovego.com`
- ❌ Bot traffic detected → Redirects to `packmovego.com`
- ❌ Rate limit exceeded → Redirects to `packmovego.com`

---

## 📝 Testing Tips

### Quick Test Sequence
1. **Health Check** (no auth)
   ```
   GET https://localhost:3000/health
   ```

2. **Gateway Root** (with auth)
   ```
   GET https://localhost:3000/
   Headers: x-api-key: {{api_key}}
   ```

3. **Content Endpoint**
   ```
   GET https://localhost:3000/v0/blog
   Headers: x-api-key: {{api_key}}
   ```

4. **Create Booking**
   ```
   POST https://localhost:3000/v0/bookings
   Headers: x-api-key: {{api_key}}
   Body: { "customerName": "Test User", "date": "2025-12-01" }
   ```

### Common Issues

**Problem:** "Redirects to packmovego.com"  
**Solution:** Ensure `x-api-key` header is present and correct

**Problem:** "SSL certificate error"  
**Solution:** Disable SSL verification in Postman Settings

**Problem:** "Connection refused"  
**Solution:** Ensure both servers are running (`npm run dev`)

**Problem:** "CORS error"  
**Solution:** Check that origin is in the allowed CORS list

---

## 🚀 Import to Postman

1. Create new **Collection** named "PackMoveGO API"
2. Create **Environment** named "Local Dev"
3. Add variable: `api_key` = `pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6`
4. Set base URL: `https://localhost:3000`
5. Add requests from this document
6. Set header `x-api-key: {{api_key}}` on all requests (except `/health`)
7. Disable SSL verification for localhost

---

## 📚 Related Documentation

- [Security Architecture](SECURITY_ARCHITECTURE.md)
- [Arcjet Protection](ARCJET_PROTECTION.md)
- [System Status](SYSTEM_STATUS.md)
- [How to Start](HOW_TO_START.md)

---

**Last Updated:** November 1, 2025  
**API Version:** v0  
**Gateway Version:** 1.0.0

