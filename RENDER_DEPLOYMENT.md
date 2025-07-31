# Render Deployment Guide

This guide will help you deploy the PackMoveGO API to Render.

## 🚀 Quick Deployment

### Option 1: Automatic Deployment (Recommended)

1. **Connect to GitHub**: 
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub account
   - Select the `PackMoveGO-API` repository

2. **Render will automatically detect the `render.yaml`** and create:
   - Private API service (`pack-go-movers-api-private`)
   - Public Gateway service (`pack-go-movers-gateway`)

3. **Set Environment Variables**:
   - Go to each service in Render Dashboard
   - Navigate to "Environment" tab
   - Add the following variables:

### Required Environment Variables

#### For Private API Service:
```
NODE_ENV=production
SERVICE_TYPE=private
MONGODB_URI=your_mongodb_connection_string
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret_key
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
EMAIL_SECURE=true
API_KEY_FRONTEND=your_frontend_api_key
API_KEY_ADMIN=your_admin_api_key
ADMIN_PASSWORD=your_admin_password
SSH_PASSWORD=your_ssh_password
WEBHOOK_SECRET=your_webhook_secret
```

#### For Gateway Service:
```
NODE_ENV=production
SERVICE_TYPE=gateway
PRIVATE_API_URL=http://pack-go-movers-api-private:3000
JWT_SECRET=your_jwt_secret_key
API_KEY_ENABLED=true
API_KEY_FRONTEND=your_frontend_api_key
```

### Option 2: Manual Deployment

If automatic deployment doesn't work, you can deploy manually:

1. **Create Private Service**:
   - Type: Private Service
   - Name: `pack-go-movers-api-private`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/src/server.js`
   - Port: 3000

2. **Create Gateway Service**:
   - Type: Web Service
   - Name: `pack-go-movers-gateway`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/src/gateway.js`
   - Port: 3000

## 🔧 Build Configuration

The project uses TypeScript and needs to be compiled before running:

```bash
npm install
npm run build
```

## 📊 Health Checks

- Private API: `/api/health`
- Gateway: `/health`

## 🔒 Security Notes

1. **Environment Variables**: Never commit sensitive data to Git
2. **API Keys**: Generate new API keys for production
3. **Database**: Use production-ready database (MongoDB Atlas recommended)
4. **SSL**: Render provides automatic SSL certificates

## 🐛 Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check TypeScript compilation errors
   - Ensure all dependencies are in `package.json`

2. **Service Won't Start**:
   - Check environment variables are set correctly
   - Verify database connection strings
   - Check logs in Render Dashboard

3. **Gateway Can't Connect to Private API**:
   - Ensure private service is running
   - Check `PRIVATE_API_URL` environment variable
   - Verify both services are in the same Render account

### Logs and Monitoring:

- View logs in Render Dashboard → Service → Logs
- Monitor performance in Render Dashboard → Service → Metrics

## 🔄 Auto-Deploy

Render will automatically redeploy when you push to the `main` branch on GitHub.

## 📞 Support

If you encounter issues:
1. Check Render documentation: https://render.com/docs
2. Check service logs in Render Dashboard
3. Verify environment variables are set correctly
4. Ensure database connections are working

## 🎯 Next Steps

After successful deployment:
1. Test all API endpoints
2. Configure custom domain (optional)
3. Set up monitoring and alerts
4. Configure backup strategies 