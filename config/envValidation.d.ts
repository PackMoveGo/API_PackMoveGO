interface EnvConfig {
    NODE_ENV: string;
    PORT: number;
    ALLOWED_IPS: string[];
    ADMIN_PASSWORD: string;
    MONGODB_URI: string;
    JWT_SECRET: string;
    CORS_ORIGIN: string[];
    CORS_METHODS: string[];
    CORS_ALLOWED_HEADERS: string[];
    STRIPE_SECRET_KEY: string;
    STRIPE_PUBLISHABLE_KEY: string;
    EMAIL_USER: string;
    EMAIL_PASSWORD: string;
    EMAIL_HOST: string;
    EMAIL_PORT: number;
    EMAIL_SECURE: boolean;
    DEBUG: boolean;
    LOG_LEVEL: string;
    PRODUCTION_DOMAIN: string;
    API_URL: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    MAINTENANCE_MODE: boolean;
    MAINTENANCE_MESSAGE: string;
}
export declare function validateEnvironment(): EnvConfig;
export default validateEnvironment;
//# sourceMappingURL=envValidation.d.ts.map