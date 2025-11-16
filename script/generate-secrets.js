#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating secure secrets for PackMoveGO API...\n');

// Generate secure secrets
const secrets = {
  JWT_SECRET: crypto.randomBytes(64).toString('hex'),
  JWT_ACCESS_SECRET: crypto.randomBytes(64).toString('hex'),
  JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
  API_KEY_FRONTEND: crypto.randomBytes(32).toString('hex'),
  API_KEY_ADMIN: crypto.randomBytes(32).toString('hex'),
  ADMIN_PASSWORD: crypto.randomBytes(16).toString('hex'),
  SSH_PASSWORD: crypto.randomBytes(16).toString('hex'),
  WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
  SESSION_SECRET: crypto.randomBytes(32).toString('hex')
};

// Display secrets for manual configuration
console.log('📋 Generated Secrets (Copy these to your environment variables):\n');
console.log('='.repeat(80));

Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('='.repeat(80));

// Create .env.example file
const envExample = `# PackMoveGO API Environment Variables
# Copy this file to .env and fill in your actual values

# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=${secrets.JWT_SECRET}
JWT_ACCESS_SECRET=${secrets.JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}

# API Keys
API_KEY_ENABLED=true
API_KEY_FRONTEND=${secrets.API_KEY_FRONTEND}
API_KEY_ADMIN=${secrets.API_KEY_ADMIN}

# Admin Access
ADMIN_PASSWORD=${secrets.ADMIN_PASSWORD}
SSH_PASSWORD=${secrets.SSH_PASSWORD}

# External Services
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
EMAIL_USER=your_email_user
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_SECURE=true

# Security
WEBHOOK_SECRET=${secrets.WEBHOOK_SECRET}
SESSION_SECRET=${secrets.SESSION_SECRET}

# CORS Configuration
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,x-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Environment
NODE_ENV=production
PORT=3000
DEBUG=false
LOG_LEVEL=info
MAINTENANCE_MODE=false

# Private Network
PRIVATE_LINK_ENABLED=false
ENABLE_SERVICE_DISCOVERY=true
MAX_OPEN_PORTS=75
PRIVATE_NETWORK_TIMEOUT=30000
`;

// Write .env.example file
const envExamplePath = path.join(__dirname, '..', '.env.example');
fs.writeFileSync(envExamplePath, envExample);

console.log('\n✅ Generated .env.example file');
console.log('\n📝 Next Steps:');
console.log('1. Copy the secrets above to your Render environment variables');
console.log('2. Update your database connection strings');
console.log('3. Configure your Stripe and email credentials');
console.log('4. Test the API with the new security configuration');

// Create a security checklist
const securityChecklist = `# Security Implementation Checklist

## ✅ Completed
- [x] Generated secure JWT secrets
- [x] Generated API keys for frontend and admin
- [x] Generated secure admin passwords
- [x] Created .env.example template
- [x] Removed hardcoded credentials from render.yaml

## 🔄 Next Steps
- [ ] Set environment variables in Render dashboard
- [ ] Update database connection strings
- [ ] Configure Stripe credentials
- [ ] Configure email service credentials
- [ ] Test API with new security configuration
- [ ] Update frontend to use API keys
- [ ] Monitor security logs
- [ ] Set up security alerts

## 🔒 Security Features Enabled
- [x] API Key Authentication
- [x] Rate Limiting (50 requests/15min)
- [x] JWT Token Validation
- [x] CORS Protection
- [x] Security Headers
- [x] Input Validation
- [x] Attack Pattern Detection
- [x] Request Size Limiting

## 📊 Monitoring
- [ ] Set up security event logging
- [ ] Configure alert notifications
- [ ] Monitor failed authentication attempts
- [ ] Track API usage patterns
`;

const checklistPath = path.join(__dirname, '..', 'SECURITY_CHECKLIST.md');
fs.writeFileSync(checklistPath, securityChecklist);

console.log('\n✅ Created SECURITY_CHECKLIST.md');
console.log('\n🔐 Security setup complete! Review the checklist for next steps.'); 