/**
 * Global Type Definitions
 */

// Environment variables
declare namespace NodeJS{
  interface ProcessEnv{
    NODE_ENV:'development'|'production'|'test';
    PORT:string;
    GATEWAY_PORT:string;
    
    // JWT Secrets
    JWT_SECRET:string;
    JWT_ACCESS_SECRET:string;
    JWT_REFRESH_SECRET:string;
    JWT_EXPIRES_IN:string;
    
    // Database
    MONGODB_URI:string;
    REDIS_URL:string;
    
    // API Keys
    API_KEY_FRONTEND:string;
    API_KEY_ADMIN:string;
    API_KEY_ENABLED:string;
    
    // Arcjet
    ARCJET_KEY:string;
    ARCJET_ENV:string;
    
    // Stripe
    STRIPE_SECRET_KEY:string;
    STRIPE_PUBLISHABLE_KEY:string;
    STRIPE_WEBHOOK_SECRET:string;
    
    // Email
    EMAIL_USER:string;
    EMAIL_PASSWORD:string;
    EMAIL_HOST:string;
    EMAIL_PORT:string;
    EMAIL_SECURE:string;
    
    // Twilio
    TWILIO_ACCOUNT_SID:string;
    TWILIO_AUTH_TOKEN:string;
    TWILIO_PHONE_NUMBER:string;
    
    // Security
    CSRF_SECRET:string;
    ENCRYPTION_MASTER_KEY:string;
    SESSION_SECRET:string;
    
    // CORS
    CORS_ORIGIN:string;
    CORS_ORIGINS:string;
    CORS_METHODS:string;
    CORS_ALLOWED_HEADERS:string;
    
    // SSL
    USE_SSL:string;
    SSL_KEY_PATH:string;
    SSL_CERT_PATH:string;
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS:string;
    RATE_LIMIT_MAX_REQUESTS:string;
    
    // Monitoring
    LOG_LEVEL:string;
    DEBUG:string;
    SENTRY_DSN:string;
    
    [key:string]:string|undefined;
  }
}

// Mongoose static methods
declare module 'mongoose'{
  interface Model<T>{
    isBlacklisted?(tokenHash:string):Promise<boolean>;
    blacklistToken?(tokenHash:string,userId:string,reason:string,expiresAt:Date):Promise<void>;
    revokeUserTokens?(userId:string,reason:string):Promise<number>;
    getActiveSessions?(userId:string):Promise<T[]>;
    countActiveSessions?(userId:string):Promise<number>;
    createSession?(userId:string,tokenHash:string,deviceInfo:any,expiresAt:Date,maxSessions:number):Promise<T>;
    updateActivity?(tokenHash:string):Promise<void>;
    revokeSession?(tokenHash:string):Promise<void>;
    revokeAllUserSessions?(userId:string):Promise<number>;
    log?(entry:Partial<T>):Promise<T>;
    getUserLogs?(userId:string,limit:number):Promise<T[]>;
    getResourceLogs?(resourceType:string,resourceId:string,limit:number):Promise<T[]>;
    getLogsByAction?(action:string,limit:number):Promise<T[]>;
    getFailedOperations?(limit:number):Promise<T[]>;
    findByPhone?(phone:string):Promise<T|null>;
  }
}

export{};

