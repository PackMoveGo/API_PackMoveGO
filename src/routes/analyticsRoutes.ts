import express from 'express';
import { performanceMonitor } from '../util/performance-monitor';
// import { requireAuth } from '../middlewares/authMiddleware'; // Unused import
import { userTracker } from '../util/user-tracker';
import { Request, Response } from 'express';

const router = express.Router();

// Admin-only analytics endpoint
router.get('/analytics/performance', (req, res) => {
  try {
    // Check if this is an admin request
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

    const summary = performanceMonitor.getSummary();
    const realTime = performanceMonitor.getRealTimeStats();

    return res.json({
      success: true,
      data: {
        ...summary,
        realTime
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve analytics data',
      timestamp: new Date().toISOString()
    });
  }
});

// Public health and basic stats endpoint
router.get('/analytics/health', (_req, res) => {
  try {
    const realTime = performanceMonitor.getRealTimeStats();
    
    return res.json({
      success: true,
      status: 'healthy',
      data: {
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        performance: {
          requestsLast5Min: realTime.requestsLast5Min,
          avgResponseTime: realTime.avgResponseTimeLast5Min + 'ms',
          activeEndpoints: realTime.activeEndpoints
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Export metrics (admin only)
router.get('/analytics/export', (req, res) => {
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

    const exportData = performanceMonitor.exportMetrics();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="packmovego-metrics-${Date.now()}.json"`);
    return res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({
      success: false,
      error: 'Export failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Real-time monitoring endpoint
router.get('/analytics/realtime', (_req, res) => {
  try {
    const realTime = performanceMonitor.getRealTimeStats();
    
    return res.json({
      success: true,
      data: realTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Real-time analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Real-time data unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Get user tracking statistics
router.get('/users/stats', (_req: Request, res: Response) => {
  try {
    const stats = userTracker.getStats();
    
    return res.json({
      success: true,
      data: {
        totalSessions: stats.totalSessions,
        activeSessions: stats.activeSessions,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving user statistics'
    });
  }
});

// Get detailed user sessions (for debugging)
router.get('/users/sessions', (_req: Request, res: Response) => {
  try {
    // This would need to be exposed from userTracker
    return res.json({
      success: true,
      message: 'User sessions endpoint - implement detailed view',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving user sessions'
    });
  }
});

export default router; 