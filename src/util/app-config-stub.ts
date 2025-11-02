/**
 * Temporary stub for old app-config imports
 * This provides backward compatibility while migrating to env.ts
 */

import envLoader from '../../config/env';

const config = envLoader.getConfig();

export const configManager = {
  getSecurityConfig: () => ({
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN,
    oauth: {
      google: {
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET
      },
      facebook: {
        appId: config.FACEBOOK_APP_ID,
        appSecret: config.FACEBOOK_APP_SECRET
      }
    }
  }),
  getApiConfig: () => ({
    baseUrl: config.API_URL || config.PRIVATE_API_URL
  }),
  getServicesConfig: () => ({
    ai: {
      openai: {
        apiKey: config.AI_API_KEY,
        model: config.AI_MODEL || 'gpt-4',
        enabled: config.AI_ENABLED
      },
      anthropic: {
        apiKey: config.AI_API_KEY,
        model: 'claude-3-sonnet',
        enabled: config.AI_ENABLED
      }
    }
  })
};

export const corsOptions = {
  origin: envLoader.getCorsOrigins(),
  credentials: true,
  methods: config.CORS_METHODS.split(','),
  allowedHeaders: config.CORS_ALLOWED_HEADERS.split(',')
};

