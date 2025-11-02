import express from 'express';
import loadBalancer from '../util/load-balancer';
import { requireAuth } from '../middlewares/authMiddleware';

const router = express.Router();

/**
 * Get load balancer status
 * GET /load-balancer/status
 */
router.get('/status', (req, res) => {
  try {
    const status = loadBalancer.getStatus();
    
    res.status(200).json({
      success: true,
      loadBalancer: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get load balancer status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get current instance information
 * GET /load-balancer/instance
 */
router.get('/instance', (req, res) => {
  try {
    const instanceInfo = loadBalancer.getInstanceInfo();
    
    res.status(200).json({
      success: true,
      instance: instanceInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get instance information',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get load balancer metrics (admin only)
 * GET /load-balancer/metrics
 */
router.get('/metrics', requireAuth, (req, res) => {
  try {
    const metrics = loadBalancer.getMetrics();
    
    res.status(200).json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get load balancer metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check for load balancer
 * GET /load-balancer/health
 */
router.get('/health', (req, res) => {
  try {
    const status = loadBalancer.getStatus();
    const isHealthy = status.metrics.status === 'healthy';
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      instanceId: status.instanceId,
      uptime: status.uptime,
      memoryUsage: status.memoryUsage,
      requestsPerSecond: status.requestsPerSecond,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      error: 'Failed to check load balancer health',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 