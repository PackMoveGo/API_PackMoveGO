# Load Balancing with Render - PackMoveGO Implementation

## Overview

This guide covers implementing load balancing for your PackMoveGO API using Render's built-in load balancing capabilities and custom load balancing utilities.

## 🚀 Load Balancing Options

### 1. **Render Built-in Load Balancing (Recommended)**

Render provides automatic load balancing for web services with the following features:

#### Configuration in `render.yaml`:
```yaml
services:
  - type: web
    name: pack-go-movers-api
    scaling:
      minInstances: 2
      maxInstances: 5
      targetConcurrency: 10
      targetCpuUtilizationPercent: 70
```

#### Key Features:
- **Auto-scaling**: Automatically scales instances based on load
- **Health checks**: Monitors instance health and removes unhealthy instances
- **Session stickiness**: Optional session affinity
- **Global load balancing**: Automatic distribution across regions

### 2. **Custom Load Balancing Implementation**

We've implemented a custom load balancing utility that provides:

#### Features:
- **Instance tracking**: Monitor individual instance performance
- **Health monitoring**: Real-time health checks
- **Session management**: Optional session stickiness
- **Metrics collection**: Performance metrics per instance
- **Response headers**: Instance information in responses

## 📊 Load Balancer Configuration

### Environment Variables

Add these to your Render environment variables:

```bash
# Load Balancing Configuration
ENABLE_LOAD_BALANCING=true
INSTANCE_ID=SET_BY_RENDER
TOTAL_INSTANCES=2
HEALTH_CHECK_INTERVAL=30000
SESSION_STICKINESS=false
```

### Scaling Configuration

```yaml
scaling:
  minInstances: 2          # Minimum instances running
  maxInstances: 5          # Maximum instances during high load
  targetConcurrency: 10    # Target concurrent requests per instance
  targetCpuUtilizationPercent: 70  # CPU threshold for scaling
```

## 🔧 Implementation Details

### 1. Load Balancer Utility (`src/util/load-balancer.ts`)

The load balancer utility provides:

```typescript
// Instance tracking
const loadBalancer = new LoadBalancer();

// Middleware for request tracking
app.use(loadBalancer.middleware);

// Get instance status
const status = loadBalancer.getStatus();
```

### 2. Load Balancer Routes (`src/route/loadBalancerRoutes.ts`)

Available endpoints:

```bash
GET /load-balancer/status    # Get load balancer status
GET /load-balancer/instance  # Get current instance info
GET /load-balancer/metrics   # Get detailed metrics (admin only)
GET /load-balancer/health    # Health check for load balancer
```

### 3. Response Headers

Each response includes instance information:

```
X-Instance-ID: instance-1234567890
X-Instance-Start: 2024-01-16T18:30:41.614Z
X-Instance-Requests: 150
X-Response-Time: 45ms
```

## 📈 Monitoring and Metrics

### Instance Metrics

Each instance tracks:
- **Requests handled**: Total requests processed
- **Average response time**: Mean response time
- **Memory usage**: Heap memory utilization
- **CPU usage**: CPU time consumption
- **Health status**: healthy/unhealthy/starting

### Health Checks

```bash
# Basic health check
curl https://api.packmovego.com/api/health

# Load balancer health check
curl https://api.packmovego.com/load-balancer/health

# Instance information
curl https://api.packmovego.com/load-balancer/instance
```

## 🎯 Deployment Steps

### 1. **Upgrade Render Plan**

First, upgrade from the free plan to at least the **Starter** plan:

```yaml
plan: starter  # Required for load balancing
```

### 2. **Update Configuration**

Update your `render.yaml`:

```yaml
services:
  - type: web
    name: pack-go-movers-api
    scaling:
      minInstances: 2
      maxInstances: 5
      targetConcurrency: 10
      targetCpuUtilizationPercent: 70
    envVars:
      - key: ENABLE_LOAD_BALANCING
        value: true
      - key: SESSION_STICKINESS
        value: false
```

### 3. **Set Environment Variables**

In your Render dashboard, add:

```bash
ENABLE_LOAD_BALANCING=true
SESSION_STICKINESS=false
HEALTH_CHECK_INTERVAL=30000
```

### 4. **Deploy and Monitor**

1. Push changes to GitHub
2. Monitor deployment in Render dashboard
3. Check load balancer status: `/load-balancer/status`
4. Monitor instance health: `/load-balancer/health`

## 🔍 Testing Load Balancing

### 1. **Basic Load Test**

```bash
# Test with multiple concurrent requests
for i in {1..10}; do
  curl -s https://api.packmovego.com/load-balancer/instance &
done
wait
```

### 2. **Session Stickiness Test**

```bash
# Test session stickiness
curl -H "X-Session-ID: test-session" https://api.packmovego.com/load-balancer/instance
```

### 3. **Health Check Monitoring**

```bash
# Monitor health across instances
while true; do
  curl -s https://api.packmovego.com/load-balancer/health | jq .
  sleep 30
done
```

## 📊 Performance Optimization

### 1. **Database Connection Pooling**

Ensure your MongoDB connection supports multiple instances:

```typescript
// In your database configuration
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000
};
```

### 2. **Session Management**

For session stickiness, consider using Redis:

```typescript
// Session storage with Redis
const sessionStore = new RedisStore({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  ttl: 86400 // 24 hours
});
```

### 3. **Caching Strategy**

Implement caching to reduce database load:

```typescript
// Cache frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

## 🚨 Troubleshooting

### Common Issues

1. **Instance Not Scaling**
   - Check `targetCpuUtilizationPercent` setting
   - Verify health check endpoint responds
   - Monitor instance metrics

2. **Session Issues**
   - Ensure session storage is shared (Redis)
   - Check session stickiness configuration
   - Verify session cookies are set correctly

3. **Database Connection Limits**
   - Increase MongoDB connection pool size
   - Monitor connection usage
   - Consider connection pooling

4. **Memory Issues**
   - Monitor memory usage per instance
   - Check for memory leaks
   - Adjust instance memory limits

### Debug Commands

```bash
# Check instance status
curl https://api.packmovego.com/load-balancer/status

# Monitor instance metrics
curl https://api.packmovego.com/load-balancer/metrics

# Test health across instances
curl https://api.packmovego.com/load-balancer/health
```

## 💰 Cost Considerations

### Render Pricing (as of 2024)

- **Free Plan**: Single instance, no load balancing
- **Starter Plan**: $7/month - 2-5 instances, basic load balancing
- **Standard Plan**: $25/month - 2-10 instances, advanced load balancing
- **Pro Plan**: $100/month - 2-20 instances, global load balancing

### Optimization Tips

1. **Start Small**: Begin with 2 instances and scale up
2. **Monitor Usage**: Track instance utilization
3. **Optimize Code**: Reduce response times to handle more requests per instance
4. **Use Caching**: Reduce database load and improve performance

## 🔐 Security Considerations

### 1. **Instance Isolation**

- Each instance runs in isolated containers
- No shared filesystem between instances
- Environment variables are instance-specific

### 2. **Session Security**

- Use secure session cookies
- Implement session rotation
- Monitor for session hijacking

### 3. **Rate Limiting**

- Implement per-instance rate limiting
- Consider global rate limiting
- Monitor for abuse patterns

## 📈 Scaling Strategy

### 1. **Horizontal Scaling**

- Add more instances for increased load
- Use auto-scaling based on metrics
- Monitor instance performance

### 2. **Vertical Scaling**

- Increase instance resources (CPU/memory)
- Optimize application performance
- Reduce response times

### 3. **Database Scaling**

- Use MongoDB Atlas for database scaling
- Implement read replicas
- Consider database sharding for large datasets

## 🎯 Success Metrics

Monitor these metrics to ensure load balancing is working:

1. **Response Time**: Should remain consistent across instances
2. **Throughput**: Total requests handled per second
3. **Error Rate**: Should be low and consistent
4. **Instance Health**: All instances should be healthy
5. **Resource Utilization**: CPU and memory usage should be balanced

## 📞 Support

For issues with Render load balancing:

1. **Render Documentation**: https://render.com/docs/load-balancing
2. **Render Support**: Available in your Render dashboard
3. **Community**: Render Discord and forums

---

## 🚀 Quick Start Checklist

- [ ] Upgrade to Starter plan or higher
- [ ] Update `render.yaml` with scaling configuration
- [ ] Set environment variables in Render dashboard
- [ ] Deploy and verify load balancer status
- [ ] Test with multiple concurrent requests
- [ ] Monitor instance health and performance
- [ ] Configure alerts for unhealthy instances
- [ ] Document instance-specific configurations

Your PackMoveGO API is now ready for production load balancing! 🎉 