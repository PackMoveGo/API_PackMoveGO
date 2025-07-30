# PackMoveGO API Deployment Guide

## 🚀 Deploying to Render

### Prerequisites
- GitHub repository connected to Render
- MongoDB Atlas cluster configured
- Environment variables set up

### 1. Repository Setup
Ensure your repository is connected to Render:
- Repository: `https://github.com/SereneAura2/PackMoveGO-API`
- Branch: `main`

### 2. Environment Configuration

The API uses configuration from the `/config` folder. Key environment variables:

#### Required Environment Variables:
```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://admin:nJPb6TTiYqfjjexI@packmovego.9yxraau.mongodb.net/?retryWrites=true&w=majority&appName=PackMoveGo
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=...
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
JWT_SECRET=a131fba4ee1366460f9b1da9ae09e620076459338f7248af25eb09c3b9a613fc33e2b8b9a2b931246f74c6e7f7844a66214363d625e65cd138aa92e5d4691ce0
STRIPE_SECRET_KEY=sk_test_51RQf97G30oP5XDB4K2qGGlvmrVakLAvI9yA1wSv7MOgKHlVP0kWF2kpX1PHkDkUDpAItx02nTTXv8nklBlt47s0k00htF0jNc5
EMAIL_USER=support@packmovego.com
EMAIL_PASSWORD=rE7WDXudXYCQscG
```

### 3. Build Configuration

#### Build Command:
```bash
npm install && npm run build
```

#### Start Command:
```bash
npm start
```

#### Health Check Path:
```
/api/health
```

### 4. API Endpoints

Once deployed, your API will be available at:
- **Production URL**: `https://api.packmovego.com`
- **Health Check**: `https://api.packmovego.com/api/health`
- **Content APIs**: `https://api.packmovego.com/v0/blog`, `https://api.packmovego.com/v0/about`, etc.

### 5. Versioned API Endpoints

All content endpoints are versioned with `/v0/`:
- `/api/v0/blog` - Blog posts and categories
- `/api/v0/about` - About page content
- `/api/v0/nav` - Navigation menu
- `/api/v0/contact` - Contact information
- `/api/v0/referral` - Referral program data
- `/api/v0/reviews` - Customer reviews
- `/api/v0/locations` - Service locations
- `/api/v0/supplies` - Moving supplies
- `/api/v0/services` - Moving services
- `/api/v0/testimonials` - Customer testimonials

### 6. Database Configuration

#### MongoDB (Primary Database)
- **Connection**: MongoDB Atlas cluster
- **Database**: packmovego
- **Collections**: users, prelaunch_subscribers

#### Prisma (PostgreSQL - Optional)
- **Connection**: Prisma Accelerate
- **Usage**: Currently not used (MongoDB is primary)

### 7. CORS Configuration

Production CORS settings:
- **Origins**: `https://www.packmovego.com`, `https://packmovego.com`
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

### 8. Security Features

- **IP Whitelist**: Configured for production domains
- **Rate Limiting**: 100 requests per 15 minutes
- **JWT Authentication**: Configured for user sessions
- **Helmet.js**: Security headers enabled

### 9. Monitoring

#### Health Check Response:
```json
{
  "status": "ok",
  "environment": "production",
  "serverPort": 10000,
  "timestamp": "2024-01-16T18:30:41.614Z"
}
```

### 10. Troubleshooting

#### Common Issues:

1. **MongoDB Connection Failed**
   - Check MongoDB Atlas network access
   - Verify credentials in environment variables
   - Ensure cluster is running

2. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check TypeScript compilation

3. **CORS Errors**
   - Verify CORS_ORIGIN includes your frontend domain
   - Check that requests include proper headers

4. **Environment Variables**
   - Ensure all required variables are set in Render dashboard
   - Check for typos in variable names
   - Verify sensitive data is properly encrypted

### 11. Deployment Steps

1. **Push to GitHub**: Ensure all changes are committed and pushed
2. **Render Auto-Deploy**: Should trigger automatically
3. **Monitor Build**: Check build logs for any errors
4. **Test Health Check**: Verify `/api/health` endpoint responds
5. **Test API Endpoints**: Verify all versioned endpoints work
6. **Update DNS**: Point `api.packmovego.com` to Render URL

### 12. Post-Deployment Verification

Test these endpoints after deployment:
```bash
# Health check
curl https://api.packmovego.com/api/health

# Content APIs
curl https://api.packmovego.com/v0/blog
curl https://api.packmovego.com/v0/nav
curl https://api.packmovego.com/v0/services
```

### 13. Environment Files

- **Development**: `config/.env`
- **Production**: `config/.env.production`
- **Render**: Uses environment variables from dashboard

### 14. Performance Optimization

- **Caching**: Implement Redis for session storage
- **CDN**: Use Cloudflare for static assets
- **Database**: Optimize MongoDB queries
- **Monitoring**: Set up logging and analytics
- **Load Balancing**: Configure auto-scaling and instance management

### 15. Load Balancing

#### Render Load Balancing Features:
- **Auto-scaling**: 2-5 instances based on load
- **Health monitoring**: Automatic instance health checks
- **Session stickiness**: Optional session affinity
- **Global distribution**: Automatic load distribution

#### Load Balancer Endpoints:
```bash
GET /load-balancer/status    # Load balancer status
GET /load-balancer/instance  # Current instance info
GET /load-balancer/metrics   # Detailed metrics (admin)
GET /load-balancer/health    # Health check
```

#### Configuration:
```yaml
# In render.yaml
scaling:
  minInstances: 2
  maxInstances: 5
  targetConcurrency: 10
  targetCpuUtilizationPercent: 70
```

For detailed load balancing setup, see `LOAD_BALANCING.md`.

---

## 🎯 Success Criteria

✅ API responds to health checks  
✅ All versioned endpoints return data  
✅ CORS allows frontend requests  
✅ MongoDB connection established  
✅ Environment variables loaded correctly  
✅ Security middleware active  
✅ Rate limiting functional  

Your API is ready for production deployment! 🚀 