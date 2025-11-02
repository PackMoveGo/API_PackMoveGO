# Render Deployment Guide

This guide provides step-by-step instructions for deploying the PackMoveGO backend to Render with two separate services: a **Private Service** (API server) and a **Web Service** (Gateway).

## Architecture Overview

```
Internet → Gateway (Web Service) → Server (Private Service) → MongoDB
           Port: Auto-assigned       Port: Auto-assigned
           Public Access             Internal Only
```

- **Gateway**: Public-facing service that handles incoming requests and proxies to the private server
- **Server**: Private service that runs the main API logic, only accessible from the gateway

---

## Prerequisites

1. A Render account ([render.com](https://render.com))
2. GitHub repository connected to Render
3. MongoDB Atlas database or other MongoDB instance
4. All required environment variables ready (see below)

---

## Deployment Steps

### Step 1: Create the Private Service (API Server)

1. **Log into Render Dashboard**
2. Click **"New +"** → **"Private Service"**
3. **Connect Repository**:
   - Select your GitHub repository
   - Branch: `main` or your production branch
4. **Configure Service**:
   - **Name**: `packmovego-api-private`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/src/server-entry.js`
   - **Plan**: Select `Starter` (required for load balancing features)
5. **Configure Environment Variables** (click "Advanced" → "Add Environment Variable"):

   ```bash
   NODE_ENV=production
   SERVICE_TYPE=private
   
   # Authentication & Security
   JWT_SECRET=a131fba4ee1366460f9b1da9ae09e620076459338f7248af25eb09c3b9a613fc33e2b8b9a2b931246f74c6e7f7844a66214363d625e65cd138aa92e5d4691ce0
   ADMIN_PASSWORD=packmovego2024
   
   # API Keys
   API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
   API_KEY_ADMIN=pmg_admin_live_sk_m9x2c8v5b1n7q4w8e3r6t9y2u5i8o1p4
   API_KEY_ENABLED=false
   
   # Arcjet Security
   ARCJET_KEY=ajkey_01k8ta94w3epb8g52cv9v0kjce
   ARCJET_ENV=production
   
   # Database
   MONGODB_URI=mongodb+srv://billing_db_user:rcDD9uzRoNBTV3sl@packmovego.8fewh5y.mongodb.net/?retryWrites=true&w=majority&appName=Packmovego
   
   # CORS
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
   
   # Private Network
   PRIVATE_LINK_ENABLED=true
   ENABLE_SERVICE_DISCOVERY=true
   MAX_OPEN_PORTS=75
   PRIVATE_NETWORK_TIMEOUT=30000
   
   # Load Balancing
   ENABLE_LOAD_BALANCING=true
   HEALTH_CHECK_INTERVAL=30000
   SESSION_STICKINESS=false
   
   # Access Control
   ALLOWED_IPS=172.58.112.138,127.0.0.1
   ALLOWED_DOMAINS=api.packmovego.com,www.packmovego.com,packmovego.com
   ```

6. **Configure Scaling** (under "Scaling" tab):
   - Minimum Instances: `2`
   - Maximum Instances: `5`
   - Target CPU: `70%`
   - Target Concurrency: `10`

7. **Configure Health Check**:
   - Health Check Path: `/api/health`

8. Click **"Create Private Service"**

9. **Note the Internal URL**: After deployment, Render will provide an internal URL like:
   ```
   http://packmovego-api-private:10000
   ```
   Copy this URL - you'll need it for the Gateway configuration.

---

### Step 2: Create the Web Service (Gateway)

1. **Return to Render Dashboard**
2. Click **"New +"** → **"Web Service"**
3. **Connect Repository**:
   - Select the same GitHub repository
   - Branch: `main` or your production branch
4. **Configure Service**:
   - **Name**: `packmovego-gateway`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/src/gateway/gateway-entry.js`
   - **Plan**: Select `Starter`
5. **Configure Environment Variables**:

   ```bash
   NODE_ENV=production
   SERVICE_TYPE=gateway
   
   # Private API URL - USE THE INTERNAL URL FROM STEP 1
   PRIVATE_API_URL=http://packmovego-api-private:10000
   
   # Authentication & Security
   JWT_SECRET=a131fba4ee1366460f9b1da9ae09e620076459338f7248af25eb09c3b9a613fc33e2b8b9a2b931246f74c6e7f7844a66214363d625e65cd138aa92e5d4691ce0
   
   # API Keys
   API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6
   API_KEY_ENABLED=true
   
   # Arcjet Security
   ARCJET_KEY=ajkey_01k8ta94w3epb8g52cv9v0kjce
   
   # CORS
   CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
   ```

6. **Configure Health Check**:
   - Health Check Path: `/health`

7. Click **"Create Web Service"**

8. **Note the Public URL**: Render will provide a public URL like:
   ```
   https://packmovego-gateway.onrender.com
   ```

---

## Step 3: Configure Custom Domain (Optional)

1. In the Gateway service, go to **"Settings"** → **"Custom Domain"**
2. Add your domain: `api.packmovego.com`
3. Update your DNS records as instructed by Render
4. Wait for SSL certificate to be provisioned

---

## Step 4: Verify Deployment

### Test the Gateway Health Check
```bash
curl https://packmovego-gateway.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-02T..."
}
```

### Test an API Endpoint
```bash
curl -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://packmovego-gateway.onrender.com/auth/status
```

Expected response:
```json
{
  "success": true,
  "authenticated": false,
  "message": "Auth status endpoint",
  "timestamp": "2025-11-02T..."
}
```

### Check Logs

1. **Gateway Logs**: Go to Gateway service → "Logs" tab
2. **Server Logs**: Go to Private Service → "Logs" tab

Look for:
- ✅ Successful startup messages
- ✅ Environment variables loaded correctly
- ✅ Database connection established
- ✅ No errors or warnings

---

## Environment Variables Reference

### Required Variables (Both Services)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Secret for JWT token signing | 64+ character string |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `API_KEY_FRONTEND` | Frontend API key | `pmg_frontend_live_sk_...` |
| `ARCJET_KEY` | Arcjet security key | `ajkey_...` |

### Gateway-Specific Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SERVICE_TYPE` | Service identifier | `gateway` |
| `PRIVATE_API_URL` | Internal URL of private service | `http://packmovego-api-private:10000` |
| `API_KEY_ENABLED` | Enable API key validation | `true` |

### Server-Specific Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SERVICE_TYPE` | Service identifier | `private` |
| `ENABLE_LOAD_BALANCING` | Enable load balancing | `true` |
| `PRIVATE_LINK_ENABLED` | Enable private networking | `true` |

---

## Troubleshooting

### Issue: Gateway can't connect to Private Service

**Symptoms**: Gateway logs show connection errors to private service

**Solution**:
1. Verify the `PRIVATE_API_URL` in gateway matches the internal URL from Render
2. Ensure both services are deployed and running
3. Check that private service health check is passing

### Issue: Environment variables not loaded

**Symptoms**: Application crashes with missing environment variable errors

**Solution**:
1. Verify all required environment variables are set in Render Dashboard
2. Check for typos in variable names
3. Redeploy the service after adding missing variables

### Issue: Build fails

**Symptoms**: Deployment fails during build phase

**Solution**:
1. Check build logs for specific errors
2. Verify `package.json` and `tsconfig.json` are correct
3. Test build locally: `npm run build`
4. Ensure all dependencies are listed in `package.json`

### Issue: Database connection fails

**Symptoms**: Application starts but can't connect to MongoDB

**Solution**:
1. Verify `MONGODB_URI` is correct
2. Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for Render)
3. Ensure database user has correct permissions
4. Check database logs in MongoDB Atlas

### Issue: CORS errors

**Symptoms**: Frontend can't access API endpoints

**Solution**:
1. Verify `CORS_ORIGIN` includes your frontend domain
2. Check that `CORS_METHODS` includes required HTTP methods
3. Ensure `CORS_ALLOWED_HEADERS` includes all required headers

---

## Monitoring & Maintenance

### View Logs
- **Real-time**: Render Dashboard → Service → "Logs" tab
- **Historical**: Enable log streaming to external service (e.g., Datadog, Papertrail)

### Scale Services
- Go to Service → "Scaling" tab
- Adjust min/max instances based on traffic
- Monitor CPU and memory usage

### Update Environment Variables
1. Go to Service → "Environment" tab
2. Add/modify variables
3. Service will automatically redeploy

### Redeploy Manually
- Service → "Manual Deploy" → "Deploy latest commit"
- Or push to connected GitHub branch

---

## Cost Estimation

### Starter Plan (per service)
- **Gateway**: $7/month + usage
- **Server (2 instances)**: $14/month + usage
- **Total**: ~$21/month + bandwidth/compute overages

### Free Tier Alternative
- Both services can run on free tier for testing
- Free tier includes:
  - 750 hours/month
  - 512MB RAM
  - Sleeps after 15 min inactivity
  - Not recommended for production

---

## Next Steps

1. ✅ Deploy both services to Render
2. ✅ Verify health checks pass
3. ✅ Test API endpoints
4. ✅ Configure custom domain
5. ✅ Set up monitoring alerts
6. ✅ Configure backup strategy for MongoDB
7. ✅ Document API endpoints for frontend team

---

## Support Resources

- **Render Documentation**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Project Documentation**: See `/docs` folder
- **API Reference**: See `/docs/api/POSTMAN_API_ENDPOINTS.md`

---

## Additional Configuration Files

### render.yaml
The project includes a `render.yaml` file that can be used for Infrastructure as Code deployment:

```yaml
# See render.yaml in project root
```

To use this:
1. Push `render.yaml` to your repository
2. In Render Dashboard, click "New +" → "Blueprint"
3. Select your repository
4. Render will create both services automatically from the YAML file

---

## Security Checklist

- [ ] JWT_SECRET is strong and unique (64+ characters)
- [ ] API keys are stored securely in Render Dashboard (not in code)
- [ ] CORS_ORIGIN is restricted to your actual domains
- [ ] MongoDB connection uses TLS/SSL
- [ ] Arcjet protection is enabled and configured
- [ ] Rate limiting is enabled
- [ ] Health check endpoints don't expose sensitive information
- [ ] Logs don't contain sensitive data
- [ ] Environment variables are not committed to git

---

**Deployment Complete!** 🎉

Your PackMoveGO backend is now running on Render with:
- ✅ Public Gateway for external access
- ✅ Private Server for internal processing
- ✅ Load balancing and auto-scaling
- ✅ Health monitoring
- ✅ Secure environment variable management

