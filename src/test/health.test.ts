import request from 'supertest';
import express from 'express';
import { setupTestEnvironment, cleanupTestEnvironment } from './setup';

// Create a simple test app
const app = express();

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

describe('Health Check API', () => {
  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  it('should return 200 and health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should include environment information', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.environment).toBe('test');
  });
});

describe('Environment Configuration', () => {
  it('should have required environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.PORT).toBe('3001');
    expect(process.env.ALLOWED_IPS).toBeDefined();
    expect(process.env.ADMIN_PASSWORD).toBeDefined();
    expect(process.env.JWT_SECRET).toBeDefined();
  });
}); 