# Private Network Implementation

This document outlines the comprehensive private network integration for PackMoveGO API, based on [Render's Private Network documentation](https://render.com/docs/private-network#integrating-with-aws-privatelink).

## Overview

The implementation provides:

1. **Private Network Communication** - Secure service-to-service communication without traversing the public internet
2. **Service Discovery** - DNS-based discovery of service instances on the private network
3. **AWS PrivateLink Integration** - Secure connections to AWS services like MongoDB Atlas, Snowflake, etc.
4. **Port Management** - Validation and management of private network ports
5. **Health Monitoring** - Comprehensive health checks for private network services

## Features Implemented

### 1. Private Network Manager (`src/util/private-network.ts`)

Core functionality for managing private network operations:

- **Service Discovery**: DNS-based discovery using `RENDER_DISCOVERY_SERVICE`
- **Port Validation**: Ensures ports aren't in restricted list (10000, 18012, 18013, 19099)
- **Service Registry**: Internal registry of available services
- **Health Checks**: Monitor service health across the private network

### 2. AWS PrivateLink Manager (`src/util/aws-privatelink.ts`)

Specialized manager for AWS service connections:

- **Supported Services**: MongoDB Atlas, Snowflake, S3, RDS, ElastiCache, OpenSearch, DocumentDB, DynamoDB
- **Connection Templates**: Pre-configured connection strings for each service
- **Configuration Management**: VPC endpoint and DNS configuration
- **Connection Testing**: Validate PrivateLink connections

### 3. Private Network Routes (`src/route/privateNetworkRoutes.ts`)

Dedicated API endpoints for private network operations:

```
GET    /internal/health                     - Private network health check
GET    /internal/services                   - List all registered services
POST   /internal/services/register          - Register a new service
GET    /internal/services/:serviceName      - Get specific service info
GET    /internal/discovery/:serviceName     - Discover service instances
POST   /internal/services/url               - Create internal URLs
GET    /internal/privatelink/status         - PrivateLink status
POST   /internal/privatelink/connect/:aws   - Connect to AWS service
POST   /internal/privatelink/test/:aws      - Test AWS connection
GET    /internal/privatelink/services       - List supported AWS services
PUT    /internal/privatelink/config         - Update PrivateLink config
POST   /internal/validate/port              - Validate port usage
GET    /internal/config                     - Get network configuration
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# === PRIVATE NETWORK CONFIGURATION ===
# Render automatically sets these when running on private network
# RENDER_SERVICE_NAME=pack-go-movers-api
# RENDER_DISCOVERY_SERVICE=pack-go-movers-api-discovery
# RENDER_REGION=oregon
# RENDER_WORKSPACE=production
# RENDER_ENVIRONMENT=production

# Internal hostname (set by Render or custom)
INTERNAL_HOSTNAME=localhost

# AWS PrivateLink Configuration
PRIVATE_LINK_ENABLED=false
# VPC_ENDPOINT_ID=vpce-12345678
# PRIVATE_LINK_SERVICE_ENDPOINT=
# PRIVATE_LINK_DNS_NAME=
# AVAILABILITY_ZONES=us-west-2a,us-west-2b
# SECURITY_GROUPS=sg-12345,sg-67890

# Private Network Settings
MAX_OPEN_PORTS=75
ENABLE_SERVICE_DISCOVERY=true
PRIVATE_NETWORK_TIMEOUT=30000
```

### Render Configuration

Update your `render.yaml`:

```yaml
services:
  - type: web
    name: pack-go-movers-api
    # ... existing configuration ...
    envVars:
      # ... existing variables ...
      # Private Network Configuration
      - key: PRIVATE_LINK_ENABLED
        value: false
      - key: ENABLE_SERVICE_DISCOVERY
        value: true
      - key: MAX_OPEN_PORTS
        value: 75
      - key: PRIVATE_NETWORK_TIMEOUT
        value: 30000

  # Optional: Add a private service for internal communication
  # Uncomment and configure when upgrading to Professional plan
  # - type: private
  #   name: pack-go-movers-internal
  #   env: node
  #   repo: https://github.com/SereneAura2/PackMoveGO-API
  #   buildCommand: npm install && npm run build
  #   startCommand: node dist/server.js
  #   envVars:
  #     - key: NODE_ENV
  #       value: production
  #     - key: SERVICE_TYPE
  #       value: internal
  #     - key: PRIVATE_LINK_ENABLED
  #       value: true
  #   # Private services can listen on custom ports
  #   port: 8080
```

## Usage Examples

### 1. Service Discovery

```javascript
// Get all services on private network
const response = await fetch('/internal/services');
const { services } = await response.json();

// Register a new service
await fetch('/internal/services/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'my-service',
    internalAddress: 'my-service-abc123:8080',
    port: 8080,
    protocol: 'http',
    type: 'web'
  })
});

// Discover service instances
const discoveryResponse = await fetch('/internal/discovery/my-service');
const { instanceIPs } = await discoveryResponse.json();
```

### 2. AWS PrivateLink

```javascript
// Check PrivateLink status
const statusResponse = await fetch('/internal/privatelink/status');
const { enabled, supportedServices } = await statusResponse.json();

// Connect to MongoDB Atlas
const connectionResponse = await fetch('/internal/privatelink/connect/mongodb', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'password123',
    database: 'production'
  })
});
const { connectionString } = await connectionResponse.json();

// Test connection
const testResponse = await fetch('/internal/privatelink/test/mongodb', {
  method: 'POST'
});
const { success, latency } = await testResponse.json();
```

### 3. Port Validation

```javascript
// Validate a port before using it
const validationResponse = await fetch('/internal/validate/port', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ port: 8080 })
});
const { valid, message } = await validationResponse.json();
```

## Private Network Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Web Service   │    │ Private Service │
│   (Public)      │    │ (pack-go-api)   │    │  (Optional)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ HTTPS (Public)        │                       │
         │                       │← Private Network →   │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  AWS Services   │
                    │ (via PrivateLink)│
                    │                 │
                    │ • MongoDB Atlas │
                    │ • Snowflake     │
                    │ • S3, RDS, etc. │
                    └─────────────────┘
```

## Deployment Steps

### 1. Development Environment

1. Update your `.env` file with private network configuration
2. The server will detect it's not on Render and use localhost fallbacks
3. Test the `/internal/*` endpoints locally

### 2. Render Deployment

1. Deploy your updated code to Render
2. Render will automatically set `RENDER_SERVICE_NAME` and `RENDER_DISCOVERY_SERVICE`
3. Private network features will be automatically enabled

### 3. Professional Plan Features

For Professional plans and above:

1. **Private Services**: Uncomment the private service configuration in `render.yaml`
2. **AWS PrivateLink**: Configure VPC endpoints in your AWS account
3. **Environment Blocking**: Use Render's environment isolation features

## Monitoring

### Health Checks

The implementation provides comprehensive health monitoring:

```bash
# Basic health check
curl https://your-app.onrender.com/health

# Private network health check
curl https://your-app.onrender.com/internal/health

# Service-specific health check
curl https://your-app.onrender.com/internal/services/my-service
```

### Startup Logs

When the server starts, you'll see detailed private network status:

```
🚀 === PackMoveGO REST API Server ===
📡 API Server: http://localhost:3000
🔧 Environment: production
🔗 === Private Network Status ===
🌐 Private Network: ✅ Enabled
🏠 Internal Hostname: pack-go-movers-api-abc123
🔍 Discovery Hostname: pack-go-movers-api-abc123-discovery
📍 Region: oregon
🔗 Instance IPs: 10.0.1.15, 10.0.1.16
🔐 PrivateLink: ❌ Disabled
📝 Internal Health: http://pack-go-movers-api-abc123/internal/health
🔍 Service Discovery: http://pack-go-movers-api-abc123/internal/services
```

## Security Considerations

1. **Port Restrictions**: The system automatically validates against Render's restricted ports
2. **Internal Endpoints**: `/internal/*` endpoints are designed for private network communication
3. **CORS Configuration**: Private network hostnames are automatically allowed in CORS
4. **Authentication**: Consider adding authentication for sensitive internal endpoints

## Best Practices

1. **Service Registration**: Register all your services for better discoverability
2. **Health Monitoring**: Use the health check endpoints for monitoring
3. **Port Management**: Validate ports before using them in your services
4. **Connection Pooling**: Use connection pooling for AWS PrivateLink connections
5. **Error Handling**: Implement proper error handling for network operations

## Troubleshooting

### Common Issues

1. **Service Not Found**: Ensure services are registered via `/internal/services/register`
2. **Port Conflicts**: Use `/internal/validate/port` to check port availability
3. **DNS Resolution**: Check `/internal/discovery/:service` for instance IPs
4. **PrivateLink Issues**: Verify AWS VPC endpoint configuration

### Debug Information

Use `/internal/config` to get comprehensive configuration details:

```javascript
const configResponse = await fetch('/internal/config');
const { privateNetwork, privateLink, environment } = await configResponse.json();
console.log('Private Network Config:', privateNetwork);
console.log('PrivateLink Config:', privateLink);
console.log('Environment Variables:', environment);
```

## References

- [Render Private Network Documentation](https://render.com/docs/private-network)
- [AWS PrivateLink Documentation](https://docs.aws.amazon.com/vpc/latest/privatelink/)
- [MongoDB Atlas PrivateLink](https://docs.atlas.mongodb.com/private-endpoint/)
- [Snowflake PrivateLink](https://docs.snowflake.com/en/user-guide/private-snowflake-service.html) 