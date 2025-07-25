import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../config/.env') });

// Setup function to run before all tests
export const setupTestDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  await mongoose.connect(uri);
  console.log('✅ Test database connected');
};

// Teardown function to run after all tests
export const teardownTestDB = async () => {
  await mongoose.connection.close();
  console.log('✅ Test database disconnected');
};

// Clean database between tests
export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Mock environment variables for testing
export const mockEnvVars = {
  NODE_ENV: 'test',
  PORT: '3001',
  ALLOWED_IPS: '127.0.0.1,192.168.1.1',
  ADMIN_PASSWORD: 'test-password',
  JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-testing',
  CORS_ORIGIN: 'http://localhost:3000,http://localhost:3001',
  CORS_METHODS: 'GET,POST,PUT,DELETE,OPTIONS',
  CORS_ALLOWED_HEADERS: 'Content-Type,Authorization',
  MONGODB_URI: 'mongodb://localhost:27017/test',
  STRIPE_SECRET_KEY: 'sk_test_test',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_test',
  EMAIL_USER: 'test@example.com',
  EMAIL_PASSWORD: 'test-password',
  EMAIL_HOST: 'localhost',
  EMAIL_PORT: '587',
  EMAIL_SECURE: 'false',
  DEBUG: 'true',
  LOG_LEVEL: 'debug',
  PRODUCTION_DOMAIN: 'https://test.packmovego.com',
  API_URL: 'https://test-api.packmovego.com',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100',
  MAINTENANCE_MODE: 'false',
  MAINTENANCE_MESSAGE: 'Test maintenance message'
};

// Setup test environment
export const setupTestEnvironment = () => {
  // Set test environment variables
  Object.entries(mockEnvVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

// Cleanup test environment
export const cleanupTestEnvironment = () => {
  // Clear test environment variables
  Object.keys(mockEnvVars).forEach(key => {
    delete process.env[key];
  });
}; 