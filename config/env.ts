import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Determine environment
const NODE_ENV = process.env['NODE_ENV'] || 'development';
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';

// Load appropriate .env file
// Use project root to find config dir (works in both dev and compiled/production)
const projectRoot = process.cwd();
const configDir = path.join(projectRoot, 'config');
const envFile = isDevelopment 
  ? path.join(configDir, '.env.development.local')
  : path.join(configDir, '.env.production.local');

// Check if env file exists, if not, use process.env directly (Render/Production case)
if (fs.existsSync(envFile)) {
  const result = dotenv.config({ path: envFile });
  if (result.error) {
    console.error(`❌ Failed to load ${envFile}:`, result.error.message);
    process.exit(1);
  }
  console.log(`✅ Loaded environment from: ${path.basename(envFile)}`);
} else {
  console.log(`ℹ️  No .env file found at ${path.basename(envFile)}`);
  console.log(`ℹ️  Using environment variables from system (Render/Production mode)`);
  // Render and other cloud platforms inject environment variables directly
  // No need to load from file - process.env already has them
}

// Export configuration
export const config = {
  // Environment
  NODE_ENV,
  isDevelopment,
  isProduction,

  // Server
  PORT: parseInt(process.env['PORT'] || '3001', 10),
  // For Render: If GATEWAY_PORT not set, use PORT environment variable (which Render assigns)
  GATEWAY_PORT: parseInt(process.env['GATEWAY_PORT'] || process.env['PORT'] || '3000', 10),
  PRIVATE_API_URL: process.env['PRIVATE_API_URL'] || 'https://localhost:3001',
  LOCAL_NETWORK: process.env['LOCAL_NETWORK'] || 'localhost',
  SERVICE_TYPE: process.env['SERVICE_TYPE'] || 'web',

  // Security
  API_KEY_FRONTEND: process.env['API_KEY_FRONTEND'] || '',
  API_KEY_ADMIN: process.env['API_KEY_ADMIN'] || '',
  API_KEY_ENABLED: process.env['API_KEY_ENABLED'] === 'true',
  ADMIN_PASSWORD: process.env['ADMIN_PASSWORD'] || '',
  JWT_SECRET: process.env['JWT_SECRET'] || '',
  JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN'] || '24h',
  
  // Arcjet
  ARCJET_KEY: process.env['ARCJET_KEY'] || '',
  ARCJET_ENV: process.env['ARCJET_ENV'] || NODE_ENV,

  // Database
  MONGODB_URI: process.env['MONGODB_URI'] || '',
  REDIS_URL: process.env['REDIS_URL'] || 'redis://localhost:6379',

  // CORS
  CORS_ORIGIN: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  CORS_ORIGINS: (process.env['CORS_ORIGINS'] || process.env['CORS_ORIGIN'] || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
  CORS_METHODS: process.env['CORS_METHODS'] || 'GET,POST,PUT,DELETE,OPTIONS,HEAD',
  CORS_ALLOWED_HEADERS: process.env['CORS_ALLOWED_HEADERS'] || 'Content-Type,Authorization,x-api-key,X-Requested-With,Accept,Origin',

  // SSL
  USE_SSL: process.env['USE_SSL'] === 'true',
  SSL_KEY_PATH: process.env['SSL_KEY_PATH'] || '',
  SSL_CERT_PATH: process.env['SSL_CERT_PATH'] || '',
  GATEWAY_SSL_KEY_PATH: process.env['GATEWAY_SSL_KEY_PATH'] || '',
  GATEWAY_SSL_CERT_PATH: process.env['GATEWAY_SSL_CERT_PATH'] || '',
  
  // SSH
  SSH_ENABLED: process.env['SSH_ENABLED'] === 'true',
  SSH_PORT: parseInt(process.env['SSH_PORT'] || '2222', 10),
  SSH_PASSWORD: process.env['SSH_PASSWORD'] || '',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),

  // IP Whitelisting
  ALLOWED_IPS: (process.env['ALLOWED_IPS'] || '127.0.0.1,::1')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean),
  WHITELISTED_IPS: (process.env['WHITELISTED_IPS'] || '127.0.0.1,::1')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean),
  ALLOWED_DOMAINS: (process.env['ALLOWED_DOMAINS'] || 'localhost')
    .split(',')
    .map(d => d.trim())
    .filter(Boolean),

  // External Services
  STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] || '',
  STRIPE_PUBLISHABLE_KEY: process.env['STRIPE_PUBLISHABLE_KEY'] || '',
  
  // Email
  EMAIL_USER: process.env['EMAIL_USER'] || '',
  EMAIL_PASSWORD: process.env['EMAIL_PASSWORD'] || '',
  EMAIL_HOST: process.env['EMAIL_HOST'] || 'localhost',
  EMAIL_PORT: parseInt(process.env['EMAIL_PORT'] || '587', 10),
  EMAIL_SECURE: process.env['EMAIL_SECURE'] === 'true',

  // Twilio
  TWILIO_ACCOUNT_SID: process.env['TWILIO_ACCOUNT_SID'] || '',
  TWILIO_AUTH_TOKEN: process.env['TWILIO_AUTH_TOKEN'] || '',
  TWILIO_PHONE_NUMBER: process.env['TWILIO_PHONE_NUMBER'] || '',

  // Google
  GOOGLE_MAPS_API_KEY: process.env['GOOGLE_MAPS_API_KEY'] || '',
  GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID'] || '',
  GOOGLE_CLIENT_SECRET: process.env['GOOGLE_CLIENT_SECRET'] || '',
  GA_TRACKING_ID: process.env['GA_TRACKING_ID'] || '',

  // Facebook
  FACEBOOK_APP_ID: process.env['FACEBOOK_APP_ID'] || '',
  FACEBOOK_APP_SECRET: process.env['FACEBOOK_APP_SECRET'] || '',

  // AI
  AI_ENABLED: process.env['AI_ENABLED'] === 'true',
  AI_API_KEY: process.env['AI_API_KEY'] || '',
  AI_MODEL: process.env['AI_MODEL'] || 'gpt-3.5-turbo',

  // Monitoring
  SENTRY_DSN: process.env['SENTRY_DSN'] || '',
  DEBUG: process.env['DEBUG'] === 'true',
  LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',

  // Production
  PRODUCTION_DOMAIN: process.env['PRODUCTION_DOMAIN'] || 'https://www.packmovego.com',
  API_URL: process.env['API_URL'] || 'https://api.packmovego.com',
  DASHBOARD_URL: process.env['DASHBOARD_URL'] || 'https://dashboard.packmovego.com',
  
  // Role-specific dashboard URLs
  CUSTOMER_DASHBOARD_URL: process.env['CUSTOMER_DASHBOARD_URL'] || (isDevelopment ? 'https://localhost:5002' : 'https://dashboard.packmovego.com'),
  ADMIN_DASHBOARD_URL: process.env['ADMIN_DASHBOARD_URL'] || (isDevelopment ? 'https://localhost:5003' : 'https://admin.packmovego.com'),
  MOVER_DASHBOARD_URL: process.env['MOVER_DASHBOARD_URL'] || (isDevelopment ? 'https://localhost:5005' : 'https://mover.packmovego.com'),
  
  // Maintenance
  MAINTENANCE_MODE: process.env['MAINTENANCE_MODE'] === 'true',
  MAINTENANCE_MESSAGE: process.env['MAINTENANCE_MESSAGE'] || 'Site is under maintenance. Please check back soon.',

  // Mobile
  MOBILE_ACCESS_ENABLED: process.env['MOBILE_ACCESS_ENABLED'] === 'true',
  MOBILE_CORS_WILDCARD: process.env['MOBILE_CORS_WILDCARD'] === 'true',
  MOBILE_AUTH_DISABLED: process.env['MOBILE_AUTH_DISABLED'] === 'true',

  // Backup
  BACKUP_SCHEDULE: process.env['BACKUP_SCHEDULE'] || '0 2 * * *',
  BACKUP_RETENTION_DAYS: parseInt(process.env['BACKUP_RETENTION_DAYS'] || '30', 10),

  // Secrets
  SESSION_SECRET: process.env['SESSION_SECRET'] || '',
  WEBHOOK_SECRET: process.env['WEBHOOK_SECRET'] || '',
  HASH: process.env['HASH'] || '',
};

// Validation
const requiredVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'API_KEY_FRONTEND',
  'ARCJET_KEY',
];

const missingVars = requiredVars.filter(key => !config[key as keyof typeof config]);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Helper class for backward compatibility
class EnvironmentLoader {
  getConfig() {
    return config;
  }

  getCorsOrigins(): string[] {
    return config.CORS_ORIGINS;
  }

  getWhitelistedIps(): string[] {
    return config.WHITELISTED_IPS;
  }

  getAllowedIps(): string[] {
    return config.ALLOWED_IPS;
  }

  isDevelopment(): boolean {
    return config.isDevelopment;
  }

  isProduction(): boolean {
    return config.isProduction;
  }
}

const envLoader = new EnvironmentLoader();

// Log configuration
console.log(`🔧 Environment: ${config.NODE_ENV}`);
console.log(`🌐 Gateway Port: ${config.GATEWAY_PORT}`);
console.log(`🖥️  Server Port: ${config.PORT}`);
console.log(`🔐 SSL: ${config.USE_SSL ? 'Enabled' : 'Disabled'}`);
console.log(`🛡️  Arcjet: ${config.ARCJET_ENV} mode`);
console.log(`📊 Log Level: ${config.LOG_LEVEL}`);

export default envLoader;

