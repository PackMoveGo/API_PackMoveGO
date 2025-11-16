import express from 'express';
import { handleWebhook, webhookHandler } from '../util/webhook-handler';

const router = express.Router();

// Webhook endpoint for external services
router.post('/webhooks/incoming', handleWebhook);

// Webhook configuration endpoint (admin only)
router.get('/webhooks/config', (req, res) => {
  try {
    const apiKey = (Array.isArray(req.headers['x-api-key']) ? req.headers['x-api-key'][0] : req.headers['x-api-key']) || 
                   req.headers['authorization']?.replace('Bearer ', '');
    
    const isAdmin = apiKey === process.env['API_KEY_ADMIN'];
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'This endpoint requires admin API key',
        timestamp: new Date().toISOString()
      });
    }

    const config = webhookHandler.getConfig();
    return res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get webhook configuration',
      timestamp: new Date().toISOString()
    });
  }
});

// Test webhook endpoint
router.post('/webhooks/test', (req, res) => {
  try {
    const apiKey = (Array.isArray(req.headers['x-api-key']) ? req.headers['x-api-key'][0] : req.headers['x-api-key']) || 
                   req.headers['authorization']?.replace('Bearer ', '');
    
    const isAdmin = apiKey === process.env['API_KEY_ADMIN'];
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        timestamp: new Date().toISOString()
      });
    }

    // Send test webhook
    const testData = {
      message: 'Test webhook from PackMoveGO API',
      timestamp: new Date().toISOString(),
      environment: process.env['NODE_ENV'],
      source: 'PackMoveGO Backend'
    };

    return res.json({
      success: true,
      message: 'Test webhook processed',
      data: testData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    return res.status(500).json({
      success: false,
      error: 'Test webhook failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 