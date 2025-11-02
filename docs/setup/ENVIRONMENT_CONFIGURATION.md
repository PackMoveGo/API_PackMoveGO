# Environment Configuration Guide

## Overview

The PackMoveGO backend uses a centralized environment configuration system located in `config/env.ts` that loads environment variables from `.env` files and provides a type-safe configuration object.

## Configuration Files Location

All environment configuration files are located in the `config/` directory:

```
config/
├── env.ts                      # Main configuration loader
├── .env.development.local      # Development environment variables
├── .env.production.local       # Production environment variables
└── .env.example               # Template for environment variables
```

## How Environment Loading Works

### Path Resolution

The configuration system uses `process.cwd()` to locate environment files, ensuring compatibility in both development and production:

```typescript
// Use project root to find config dir (works in both dev and compiled/production)
const projectRoot=process.cwd();
const configDir=path.join(projectRoot, 'config');
const envFile=isDevelopment 
  ? path.join(configDir, '.env.development.local')
  : path.join(configDir, '.env.production.local');
```

**Why this approach?**
- Development (ts-node): Works correctly
- Production (compiled): `__dirname` would point to `dist/config/`, but files are in `config/`
- Using `process.cwd()` ensures we always find files in the source `config/` directory

### Fallback for Cloud Deployments

When deploying to platforms like Render that inject environment variables directly:

```typescript
// Check if env file exists, if not, use process.env directly (Render/Production case)
if (fs.existsSync(envFile)) {
  const result=dotenv.config({ path: envFile });
  console.log(`✅ Loaded environment from: ${path.basename(envFile)}`);
} else {
  console.log(`ℹ️  No .env file found at ${path.basename(envFile)}`);
  console.log(`ℹ️  Using environment variables from system (Render/Production mode)`);
  // Render and other cloud platforms inject environment variables directly
  // No need to load from file - process.env already has them
}
```

## Environment-Specific Ports

### Development (`NODE_ENV=development`)
```
Server (API):    Port 3001 (with HTTPS)
Gateway (Proxy): Port 3000 (with HTTPS)
```

### Production (`NODE_ENV=production`)
```
Server (API):    Port 10000 (HTTP)
Gateway (Proxy): Port 3000 (HTTP)
```

### Render Deployment
```
Server (API):    PORT assigned by Render
Gateway (Proxy): PORT assigned by Render
```

## Configuration Object

The `env.ts` exports a configuration object with all environment variables:

```typescript
export const config={
  // Environment
  NODE_ENV,
  isDevelopment,
  isProduction,

  // Server
  PORT: parseInt(process.env.PORT || '3001', 10),
  GATEWAY_PORT: parseInt(process.env.GATEWAY_PORT || '3000', 10),
  PRIVATE_API_URL: process.env.PRIVATE_API_URL || 'https://localhost:3001',

  // Security
  API_KEY_FRONTEND: process.env.API_KEY_FRONTEND || '',
  API_KEY_ADMIN: process.env.API_KEY_ADMIN || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  ARCJET_KEY: process.env.ARCJET_KEY || '',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || '',
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()),
  
  // ... more configuration
};
```

## Required Environment Variables

The following variables are required and validation will fail if missing:

```typescript
const requiredVars=[
  'JWT_SECRET',
  'MONGODB_URI',
  'API_KEY_FRONTEND',
  'ARCJET_KEY',
];
```

## Usage in Code

### Import the Configuration

```typescript
import envLoader from '../config/env';

const config=envLoader.getConfig();

// Access configuration values
const port=config.PORT;
const isDev=config.isDevelopment;
const corsOrigins=envLoader.getCorsOrigins();
```

### Helper Methods

The `EnvironmentLoader` class provides convenient helper methods:

```typescript
// Get full config object
const config=envLoader.getConfig();

// Get CORS origins as array
const corsOrigins=envLoader.getCorsOrigins();

// Get whitelisted IPs
const whitelistedIps=envLoader.getWhitelistedIps();

// Check environment
if (envLoader.isDevelopment()) {
  // Development-specific code
}

if (envLoader.isProduction()) {
  // Production-specific code
}
```

## Development Workflow

### 1. Local Development

```bash
# Start in development mode
npm run dev

# Expected output:
# ✅ Loaded environment from: .env.development.local
# 🔧 Environment: development
# 🌐 Gateway Port: 3000
# 🖥️  Server Port: 3001
# 🔐 SSL: Enabled
```

### 2. Local Production Test

```bash
# Build the project
npm run build

# Start in production mode
npm start

# Expected output:
# ✅ Loaded environment from: .env.production.local
# 🔧 Environment: production
# 🌐 Gateway Port: 3000
# 🖥️  Server Port: 10000
# 🔐 SSL: Disabled
```

### 3. Render Deployment

```bash
# No .env files needed
# Render injects environment variables directly

# Expected output:
# ℹ️  No .env file found at .env.production.local
# ℹ️  Using environment variables from system (Render/Production mode)
# 🔧 Environment: production
```

## Troubleshooting

### Issue: "Missing required environment variables"

**Cause**: Required environment variables not set in `.env` file or Render Dashboard

**Solution**:
1. Check if `.env.development.local` or `.env.production.local` exists in `config/`
2. Verify all required variables are set
3. For Render: Set variables in Render Dashboard under "Environment"

### Issue: "No .env file found"

**Cause**: Running in production mode without .env file (expected on Render)

**Solution**: This is normal for Render deployment. Ensure environment variables are set in Render Dashboard.

### Issue: Environment variables not loading after compilation

**Cause**: Path resolution issue in compiled code

**Solution**: The current implementation uses `process.cwd()` which works correctly. If issues persist:
1. Verify `config/` directory exists in project root
2. Check file permissions
3. Verify environment files are not in `.gitignore`

## Security Notes

1. **Never commit** `.env.development.local` or `.env.production.local` to git
2. Use `.env.example` as a template for required variables
3. Store production secrets in Render Dashboard, not in files
4. Rotate API keys and secrets regularly
5. Use strong, unique values for `JWT_SECRET` (64+ characters)

## Additional Resources

- See `config/ENVIRONMENT_SETUP.md` for initial setup instructions
- See `RENDER_DEPLOYMENT.md` for Render deployment guide
- See `config/.env.example` for all available environment variables

