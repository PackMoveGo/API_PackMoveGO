import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../config/.env') });

interface DatabaseConfig {
  enabled: boolean;
  uri?: string;
  maxPoolSize: number;
  connectionTimeout: number;
}

interface ServerConfig {
  port: number;
  environment: string;
  corsOrigins: string[];
}

interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
      enabled: boolean;
    };
    facebook: {
      appId: string;
      appSecret: string;
      enabled: boolean;
    };
  };
}

interface EmailConfig {
  enabled: boolean;
  provider: string;
  apiKey?: string;
  fromEmail?: string;
}

interface ApiConfig {
  baseUrl: string;
  version: string;
}

class ConfigManager {
  private static instance: ConfigManager;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getDatabaseConfig(): DatabaseConfig {
    return {
      enabled: process.env.DATABASE_ENABLED === 'true',
      uri: process.env.MONGODB_URI,
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
      connectionTimeout: parseInt(process.env.MONGODB_CONNECTION_TIMEOUT || '30000', 10)
    };
  }

  getServerConfig(): ServerConfig {
    return {
      port: parseInt(process.env.PORT || '3000', 10),
      environment: process.env.NODE_ENV || 'development',
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5000',
        'http://localhost:5001',
        'https://www.packmovego.com',
        'https://packmovego.com',
        'https://packmovego-1awwscxen-pack-move-go-frontend.vercel.app',
        'https://packmovego-mhl9ajyph-pack-move-go-frontend.vercel.app',
        'https://packmovego-o1z0apkcq-pack-move-go-frontend.vercel.app'
      ]
    };
  }

  getSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
      oauth: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          enabled: !!process.env.GOOGLE_CLIENT_ID
        },
        facebook: {
          appId: process.env.FACEBOOK_APP_ID || '',
          appSecret: process.env.FACEBOOK_APP_SECRET || '',
          enabled: !!process.env.FACEBOOK_APP_ID
        }
      }
    };
  }

  getEmailConfig(): EmailConfig {
    return {
      enabled: process.env.EMAIL_ENABLED === 'true',
      provider: process.env.EMAIL_PROVIDER || 'sendgrid',
      apiKey: process.env.EMAIL_API_KEY,
      fromEmail: process.env.EMAIL_FROM || 'noreply@packmovego.com'
    };
  }

  getApiConfig(): ApiConfig {
    return {
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      version: 'v0'
    };
  }

  getServicesConfig() {
    return {
      ai: {
        enabled: process.env.AI_ENABLED === 'true',
        openai: {
          enabled: process.env.OPENAI_ENABLED === 'true',
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
        },
        anthropic: {
          enabled: process.env.ANTHROPIC_ENABLED === 'true',
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
        }
      }
    };
  }

  getCorsOptions() {
    return {
      origin: this.getServerConfig().corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
  }

  getAllConfig() {
    return {
      database: this.getDatabaseConfig(),
      server: this.getServerConfig(),
      security: this.getSecurityConfig(),
      email: this.getEmailConfig(),
      api: this.getApiConfig()
    };
  }
}

export const configManager = ConfigManager.getInstance();
export const corsOptions = configManager.getCorsOptions(); 