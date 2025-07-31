"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../config/.env') });
const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'ADMIN_PASSWORD',
    'JWT_SECRET',
    'CORS_ORIGIN',
    'CORS_METHODS',
    'CORS_ALLOWED_HEADERS'
];
const optionalEnvVars = [
    'MONGODB_URI',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_SECURE',
    'DEBUG',
    'LOG_LEVEL',
    'PRODUCTION_DOMAIN',
    'API_URL',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
    'MAINTENANCE_MODE',
    'MAINTENANCE_MESSAGE'
];
function validateEnvironment() {
    const missingVars = [];
    // Check required environment variables
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    // Parse and validate environment configuration
    const config = {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT || '3000', 10),
        ALLOWED_IPS: process.env.ENABLE_IP_WHITELIST === 'true'
            ? (process.env.ALLOWED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean)
            : [],
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
        MONGODB_URI: process.env.MONGODB_URI || '',
        JWT_SECRET: process.env.JWT_SECRET,
        CORS_ORIGIN: (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean),
        CORS_METHODS: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(',').map(method => method.trim()),
        CORS_ALLOWED_HEADERS: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization').split(',').map(header => header.trim()),
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
        STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
        EMAIL_USER: process.env.EMAIL_USER || '',
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
        EMAIL_HOST: process.env.EMAIL_HOST || 'localhost',
        EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
        EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
        DEBUG: process.env.DEBUG === 'true',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        PRODUCTION_DOMAIN: process.env.PRODUCTION_DOMAIN || 'https://www.packmovego.com',
        API_URL: process.env.API_URL || 'https://api.packmovego.com',
        RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
        MAINTENANCE_MESSAGE: process.env.MAINTENANCE_MESSAGE || 'Site is under maintenance. Please check back soon.'
    };
    // Validate specific configurations
    if (config.PORT < 1 || config.PORT > 65535) {
        throw new Error(`Invalid PORT: ${config.PORT}. Must be between 1 and 65535`);
    }
    // Only validate ALLOWED_IPS if IP whitelisting is enabled
    if (process.env.ENABLE_IP_WHITELIST === 'true' && config.ALLOWED_IPS.length === 0) {
        throw new Error('ALLOWED_IPS must contain at least one IP address when IP whitelisting is enabled');
    }
    if (config.CORS_ORIGIN.length === 0) {
        throw new Error('CORS_ORIGIN must contain at least one origin');
    }
    if (config.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    console.log('✅ Environment validation passed');
    console.log(`🔧 Environment: ${config.NODE_ENV}`);
    console.log(`🌐 Port: ${config.PORT}`);
    console.log(`🔐 Allowed IPs: ${config.ALLOWED_IPS.join(', ')}`);
    console.log(`🌍 CORS Origins: ${config.CORS_ORIGIN.join(', ')}`);
    return config;
}
exports.default = validateEnvironment;
