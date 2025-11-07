# Render Environment Variables Setup Guide

## 🚨 CRITICAL: Required Environment Variables

Your services are failing because environment variables are missing in Render Dashboard. Follow these steps:

---

## Private API Service (API_PackMoveGO)

### Step-by-Step Setup

1. Go to https://dashboard.render.com
2. Click on **API_PackMoveGO** service
3. Click **Environment** tab (left sidebar)
4. Click **Add Environment Variable** button
5. Add each variable below:

### Required Variables

```bash
# Service Type (CRITICAL - tells index.js which service to run)
SERVICE_TYPE=private

# API Authentication (CRITICAL - required by config validation)
API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6

# Node Environment
NODE_ENV=production

# JWT Secret (Required for authentication)
JWT_SECRET=a131fba4ee1366460f9b1da9ae09e620076459338f7248af25eb09c3b9a613fc33e2b8b9a2b931246f74c6e7f7844a66214363d625e65cd138aa92e5d4691ce0

# Database (CRITICAL - MongoDB connection)
MONGODB_URI=mongodb+srv://billing_db_user:rcDD9uzRoNBTV3sl@packmovego.8fewh5y.mongodb.net/?retryWrites=true&w=majority&appName=Packmovego

# CORS Configuration
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS,HEAD
CORS_ALLOWED_HEADERS=Content-Type,Authorization,x-api-key,X-Requested-With,Accept,Origin

# Production URLs
PRODUCTION_DOMAIN=https://www.packmovego.com
API_URL=https://api.packmovego.com

# Logging
DEBUG=false
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Maintenance
MAINTENANCE_MODE=false

# Admin Password
ADMIN_PASSWORD=packmovego2024
```

### Optional Variables (Add if you have them)

```bash
# Arcjet Security (Optional but recommended)
ARCJET_KEY=ajkey_01k8ta94w3epb8g52cv9v0kjce
ARCJET_ENV=production

# Stripe Payment (If using payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Email (If using email notifications)
EMAIL_USER=your_email@domain.com
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true

# Admin API Key (If using admin features)
API_KEY_ADMIN=pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4
API_KEY_ENABLED=false
```

---

## Gateway Service (Gateway_API_PackMoveGO)

### Step-by-Step Setup

1. Go to https://dashboard.render.com
2. Click on **Gateway_API_PackMoveGO** service
3. Click **Environment** tab (left sidebar)
4. Click **Add Environment Variable** button
5. Add each variable below:

### Required Variables

```bash
# Service Type (CRITICAL - tells index.js to run gateway)
SERVICE_TYPE=gateway

# API Authentication (CRITICAL)
API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
API_KEY_ENABLED=true

# Node Environment
NODE_ENV=production

# Private API URL (CRITICAL - where to proxy requests)
PRIVATE_API_URL=http://api-packmovego-13vw:10000

# JWT Secret (Must match the API service)
JWT_SECRET=a131fba4ee1366460f9b1da9ae09e620076459338f7248af25eb09c3b9a613fc33e2b8b9a2b931246f74c6e7f7844a66214363d625e65cd138aa92e5d4691ce0

# CORS Configuration
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com

# Arcjet Security (Optional but recommended)
ARCJET_KEY=ajkey_01k8ta94w3epb8g52cv9v0kjce
```

---

## How to Add Variables in Render

### Method 1: One by One (Recommended)

1. Click **Add Environment Variable**
2. Enter **Key** (e.g., `SERVICE_TYPE`)
3. Enter **Value** (e.g., `private`)
4. Click **Save Changes**
5. Repeat for each variable

### Method 2: Bulk Add

1. Click **Add from .env** 
2. Paste all variables in this format:
   ```
   SERVICE_TYPE=private
   API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
   NODE_ENV=production
   ```
3. Click **Add Variables**

---

## ✅ Verification

After adding environment variables, the services will automatically redeploy.

### Expected Private API Service Logs:
```
🚀 PackMoveGO API Entry Point
📦 Service Type: private          ← Should say "private" not "both"
🌍 Environment: production
🔒 Starting Private API Service...
▶️  Running: /opt/render/project/src/dist/src/server-entry.js
✅ Environment validation passed
✅ MongoDB connected
✅ Server listening on port 10000
```

### Expected Gateway Service Logs:
```
🚀 PackMoveGO API Entry Point
📦 Service Type: gateway           ← Should say "gateway" not "both"
🌍 Environment: production
🔀 Starting Gateway Service...
▶️  Running: /opt/render/project/src/dist/src/gateway/gateway-entry.js
✅ Gateway started on port 10000
```

---

## 🔒 Security Notes

1. **Never commit these values to GitHub** - Only add them in Render Dashboard
2. **Use different secrets for production** - The values above are examples
3. **Rotate secrets regularly** - Especially JWT_SECRET and API keys
4. **Keep MONGODB_URI private** - Contains database credentials

---

## 📞 Troubleshooting

### Error: "Missing required environment variables: API_KEY_FRONTEND"
**Solution**: Add `API_KEY_FRONTEND` variable in Render Dashboard

### Error: "SERVICE_TYPE environment variable is not set"
**Solution**: Add `SERVICE_TYPE=private` (for API) or `SERVICE_TYPE=gateway` (for Gateway)

### Error: "MongoDB connection failed"
**Solution**: 
1. Verify `MONGODB_URI` is correct
2. Check MongoDB Atlas allows connections from `0.0.0.0/0` (all IPs)
3. Verify database user has read/write permissions

### Service keeps restarting
**Solution**: Check logs for specific error, then verify that environment variable is added correctly

---

## Quick Copy-Paste for Private API Service

```
SERVICE_TYPE=private
API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
NODE_ENV=production
JWT_SECRET=a131fba4ee1366460f9b1da9ae09e620076459338f7248af25eb09c3b9a613fc33e2b8b9a2b931246f74c6e7f7844a66214363d625e65cd138aa92e5d4691ce0
MONGODB_URI=mongodb+srv://billing_db_user:rcDD9uzRoNBTV3sl@packmovego.8fewh5y.mongodb.net/?retryWrites=true&w=majority&appName=Packmovego
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS,HEAD
CORS_ALLOWED_HEADERS=Content-Type,Authorization,x-api-key,X-Requested-With,Accept,Origin
ADMIN_PASSWORD=packmovego2024
```

## Quick Copy-Paste for Gateway Service

```
SERVICE_TYPE=gateway
API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
API_KEY_ENABLED=true
NODE_ENV=production
PRIVATE_API_URL=http://api-packmovego-13vw:10000
JWT_SECRET=a131fba4ee1366460f9b1da9ae09e620076459338f7248af25eb09c3b9a613fc33e2b8b9a2b931246f74c6e7f7844a66214363d625e65cd138aa92e5d4691ce0
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
```

---

**After adding these variables, both services should start successfully!** 🎉

