# Render Deployment Troubleshooting Guide

## Current Status: Environment Variables Not Deployed

Your backend code is successfully deployed, but the new environment variables haven't been added yet.

## Step-by-Step Fix:

### 1. Add Environment Variables to Render

Go to: https://dashboard.render.com → Your API Service → Environment Tab

Add these 4 variables:
```
API_KEY_FRONTEND = pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
API_KEY_ADMIN = pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4
API_KEY_ENABLED = true
ENABLE_IP_WHITELIST = true
```

### 2. Verify Deployment

After adding variables, Render will automatically redeploy. This takes 2-5 minutes.

Check deployment status in Render dashboard:
- Green "Live" status = Deployment successful
- Yellow "Building" = Still deploying
- Red "Failed" = Check logs for errors

### 3. Test When Ready

The monitoring script will automatically detect when deployment is complete.

You can also test manually:
```bash
node test-deployment.js
```

## Expected Results After Deployment:

✅ **With API Key**: `curl -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" https://api.packmovego.com/v0/services`
- Should return 200 with JSON data

✅ **From Your IP (173.230.100.254)**: `curl https://api.packmovego.com/v0/services`
- Should return 200 with JSON data (no API key needed)

✅ **From Frontend Domain**: Requests from packmovego.com will work
- Should return 200 with JSON data

❌ **Without Auth**: `curl https://api.packmovego.com/v0/services`
- Should return 403 with access denied message

## If Deployment Fails:

1. **Check Render Logs**: Dashboard → Your Service → Logs tab
2. **Look for**: Build errors, environment variable issues, or startup errors
3. **Common Issues**:
   - Missing npm dependencies
   - TypeScript compilation errors
   - Port binding issues

## Alternative: Manual Environment Variable Check

If you want to verify env vars are loaded, test this endpoint:
```bash
curl https://api.packmovego.com/api/health/detailed
```

This will show if the backend is reading environment variables correctly.

## Quick Frontend Test (After Deployment Works):

```javascript
// Test from your Vercel frontend
fetch('https://api.packmovego.com/v0/services', {
  headers: {
    'x-api-key': 'pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('Backend working!', data))
.catch(error => console.error('Error:', error));
``` 