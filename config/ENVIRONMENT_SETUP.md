# Environment Setup

## Environment Hierarchy

The application uses a priority-based environment loading system:

1. **`.env.local`** (highest priority) - Local overrides, gitignored
2. **`.env.development`** / **`.env.production`** - Environment-specific config
3. **`.env.global`** - Shared configuration
4. **`.env`** (lowest priority) - Fallback defaults

## Usage

### In Server.ts
```typescript
import envLoader from '../config/env-loader';
const config = envLoader.getConfig();

// Use config instead of process.env
const port = config.PORT;
const isDev = config.isDevelopment();
const corsOrigins = config.getCorsOrigins();
```

### In Gateway.ts
```typescript
import envLoader from '../../config/env-loader';
const config = envLoader.getConfig();

// Use config instead of process.env
const port = config.GATEWAY_PORT;
const privateApiUrl = config.PRIVATE_API_URL;
```

## Local Development

```bash
# Install dependencies
npm install

# Run both services with hot reload
npm run dev

# Development (SSL always enabled)
npm run dev

# Production build and start (SSL always enabled)
npm run prod
```

## Environment Variables

### Server (Private API)
- `NODE_ENV`: development/production
- `SERVICE_TYPE`: private
- `PORT`: 3000
- `MONGODB_URI`: Database connection
- `JWT_SECRET`: Authentication secret

### Gateway
- `NODE_ENV`: development/production  
- `SERVICE_TYPE`: gateway
- `GATEWAY_PORT`: 3001
- `PRIVATE_API_URL`: http://localhost:3000

### SSL Configuration
- SSL is **always enabled** by default
- `SSL_KEY_PATH`: Path to private key (default: `./ssl/dev/key.pem`)
- `SSL_CERT_PATH`: Path to certificate (default: `./ssl/dev/cert.pem`)

### SSH Configuration
- `SSH_ENABLED`: true/false
- `SSH_PORT`: 2222
- `SSH_PASSWORD`: SSH access password

## Branch Structure

### Main Branch
- Contains both server and gateway code
- Used for local development
- Single command to run both services

### Server Branch (for Render)
- Excludes gateway folder
- Contains only server-related code
- Deployed as private service

### Gateway Branch (for Render)
- Contains only gateway code
- Minimal dependencies
- Deployed as public service

## Deployment

### Render Deployment
```bash
# Deploy both services
npm run deploy
```

### Manual Branch Deployment
```bash
# Deploy server branch
git checkout server
git push origin server

# Deploy gateway branch
git checkout gateway
git push origin gateway
```

## SSL Development Setup

### Generate SSL Certificates
```bash
# Create SSL directory
mkdir -p ssl/dev

# Generate self-signed certificates
openssl req -x509 -newkey rsa:4096 -keyout ssl/dev/key.pem -out ssl/dev/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### SSL is Always Enabled
```bash
# SSL is automatically enabled for all commands
npm run dev    # SSL enabled
npm run prod   # SSL enabled
```

## SSH Development Setup

### Enable SSH
```bash
# Set environment variables
export SSH_ENABLED=true
export SSH_PORT=2222
export SSH_PASSWORD=devpassword

# Run with SSH
npm run dev
```

## Available Scripts

### Development
- `npm run dev` - Run both services with hot reload (SSL enabled)
- `npm run dev:server` - Run only server (SSL enabled)
- `npm run dev:gateway` - Run only gateway (SSL enabled)

### Production
- `npm run prod` - Build and start both services (SSL enabled)
- `npm run start` - Start compiled services (SSL enabled)
- `npm run start:server` - Start only server (SSL enabled)
- `npm run start:gateway` - Start only gateway (SSL enabled)

### Build
- `npm run build` - Build all TypeScript
- `npm run build:server` - Build only server
- `npm run build:gateway` - Build only gateway
- `npm run build:clean` - Clean build

### Deployment
- `npm run deploy` - Deploy to Render
- `npm run start:render` - Render server entry
- `npm run start:gateway:render` - Render gateway entry

## Troubleshooting

### Environment Loading Issues
- Check file paths in config folder
- Verify environment file syntax
- Ensure .env.local is gitignored

### SSL Issues
- Verify certificate paths
- Check file permissions
- SSL is always enabled by default

### SSH Issues
- Verify SSH_ENABLED=true
- Check port availability
- Ensure SSH keys exist

### Build Issues
- Run `npm run build:clean`
- Check TypeScript configs
- Verify file paths in tsconfig files
