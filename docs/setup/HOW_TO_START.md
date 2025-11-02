# 🚀 How to Start Your Services

## Quick Start

### Option 1: Use the Restart Script (Recommended)
```bash
./restart.sh
```
This automatically:
- Stops any existing services
- Clears ports 3000 and 3001
- Starts both Gateway and Server

### Option 2: Manual Start
```bash
# If ports are already in use, kill processes first:
./start-clean.sh

# Or just start normally:
npm run dev
```

---

## 🛡️ Arcjet Protection

**Arcjet is ACTIVE and working!**

### What You'll See
When services start, you'll see this warning - **IT'S NORMAL:**
```
✦Aj WARN Arcjet will use 127.0.0.1 when missing public IP address in development mode
```

This just means Arcjet is using localhost for development. It's working correctly!

### Arcjet Features Active:
- ✅ **Bot Detection** - Blocks automated bots (curl/Postman allowed for testing)
- ✅ **Rate Limiting** - 5 requests per 10 seconds per IP
- ✅ **Shield** - Protection against common attacks
- ✅ **API Key Auth** - Requires valid API key

### Your Arcjet Key:
```
ajkey_01k8ta94w3epb8g52cv9v0kjce
```

---

## 🧪 Testing Your API

### 1. Test Health (No API key needed)
```bash
curl -k https://localhost:3000/health
```

### 2. Test with API Key
```bash
curl -k -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://localhost:3000/v0/blog
```

### 3. Test without API Key (Should fail)
```bash
curl -k https://localhost:3000/v0/blog
# Expected: {"success":false,"error":"Unauthorized"...}
```

---

## 📊 Service URLs

| Service | URL | Port | Protected By |
|---------|-----|------|--------------|
| Gateway | https://localhost:3000 | 3000 | Arcjet + API Key |
| Server | https://localhost:3001 | 3001 | API Key |

---

## 🔑 API Keys

### Frontend Key (use this in your app):
```
pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
```

### Admin Key:
```
pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4
```

### How to Use:
Add header to all requests:
```
x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
```

---

## 🐛 Troubleshooting

### Problem: "EADDRINUSE: address already in use"
**Solution:**
```bash
./restart.sh
```

### Problem: Arcjet blocking legitimate requests
**Check:** Are you sending the API key header?
```bash
# Good ✅
curl -k -H "x-api-key: YOUR_KEY" https://localhost:3000/v0/blog

# Bad ❌ (will be blocked)
curl -k https://localhost:3000/v0/blog
```

### Problem: Want to see Arcjet dashboard
**Visit:** https://app.arcjet.com
- Login with your Arcjet account
- View request patterns, blocked traffic, rate limits

---

## 📝 Logs

### Gateway Logs
Look for these in your terminal:
- `✅ Loaded environment from...`
- `✦Aj WARN Arcjet will use 127.0.0.1...` ← Normal!
- `🚀 Gateway service started on port 3000`

### Arcjet Actions
- `Rate limit exceeded from {IP}` - Someone hit rate limit
- `Bot detected from {IP}` - Bot was blocked
- `Access denied from {IP}` - Shield blocked request

---

## ✅ Verification Checklist

After starting services, check:
- [ ] Gateway running on https://localhost:3000
- [ ] Server running on https://localhost:3001
- [ ] Arcjet warning appears (this is good!)
- [ ] MongoDB connected
- [ ] Health endpoint works: `curl -k https://localhost:3000/health`

---

## 🎯 Next Steps for Frontend

In your React/frontend app:

```javascript
// config.js
export const API_CONFIG = {
  baseURL: 'https://localhost:3000',
  apiKey: 'pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6'
};

// api.js
import axios from 'axios';
import { API_CONFIG } from './config';

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  headers: {
    'x-api-key': API_CONFIG.apiKey,
    'Content-Type': 'application/json'
  }
});

// Usage
const fetchBlogs = async () => {
  const response = await api.get('/v0/blog');
  return response.data;
};
```

---

**Your backend is now fully protected by Arcjet! 🛡️**

