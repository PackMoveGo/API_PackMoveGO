import express from 'express';
import { advancedSecurity } from '../util/advanced-security';
import { performanceMonitor } from '../util/performance-monitor';
import { requireAdmin } from '../middleware/authMiddleware';
import { validateAPIKey } from '../middleware/security';

const router = express.Router();

/**
 * @route GET /security/status
 * @desc Get security status and statistics
 * @access Admin only
 */
router.get('/status', validateAPIKey, requireAdmin, (req, res) => {
  try {
    const securityStats = advancedSecurity.getSecurityStats();
    const performanceStats = performanceMonitor.getSummary();
    
    res.json({
      success: true,
      data: {
        security: securityStats,
        performance: performanceStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get security status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /security/events
 * @desc Get recent security events
 * @access Admin only
 */
router.get('/events', validateAPIKey, requireAdmin, (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const securityData = advancedSecurity.exportSecurityData();
    
    const events = securityData.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, parseInt(limit as string));
    
    res.json({
      success: true,
      data: {
        events,
        total: securityData.events.length,
        blockedIPs: securityData.blockedIPs,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get security events',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /security/block-ip
 * @desc Manually block an IP address
 * @access Admin only
 */
router.post('/block-ip', validateAPIKey, requireAdmin, (req, res) => {
  try {
    const { ip, reason = 'Manual block' } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
    }
    
    advancedSecurity.manualBlockIP(ip, reason);
    
    res.json({
      success: true,
      message: `IP ${ip} has been blocked`,
      data: {
        ip,
        reason,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to block IP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /security/unblock-ip
 * @desc Manually unblock an IP address
 * @access Admin only
 */
router.post('/unblock-ip', validateAPIKey, requireAdmin, (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
    }
    
    advancedSecurity.manualUnblockIP(ip);
    
    res.json({
      success: true,
      message: `IP ${ip} has been unblocked`,
      data: {
        ip,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unblock IP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /security/blocked-ips
 * @desc Get list of currently blocked IPs
 * @access Admin only
 */
router.get('/blocked-ips', validateAPIKey, requireAdmin, (req, res) => {
  try {
    const securityData = advancedSecurity.exportSecurityData();
    
    res.json({
      success: true,
      data: {
        blockedIPs: securityData.blockedIPs,
        count: securityData.blockedIPs.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get blocked IPs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /security/analytics
 * @desc Get security analytics and trends
 * @access Admin only
 */
router.get('/analytics', validateAPIKey, requireAdmin, (req, res) => {
  try {
    const { days = 7 } = req.query;
    const securityStats = advancedSecurity.getSecurityStats();
    
    // Calculate trends
    const now = new Date();
    const daysAgo = new Date(now.getTime() - parseInt(days as string) * 24 * 60 * 60 * 1000);
    
    const recentEvents = securityStats.recentEvents.filter(event => 
      event.timestamp >= daysAgo
    );
    
    const analytics = {
      totalEvents: recentEvents.length,
      eventsByType: securityStats.eventsByType,
      eventsBySeverity: securityStats.eventsBySeverity,
      topAttackPatterns: recentEvents
        .filter(event => event.type === 'suspicious_request')
        .slice(0, 10),
      blockedIPsCount: securityStats.blockedIPs.length,
      averageRiskScore: recentEvents.length > 0 
        ? recentEvents.reduce((sum, event) => sum + (event.details?.riskScore || 0), 0) / recentEvents.length
        : 0
    };
    
    res.json({
      success: true,
      data: {
        analytics,
        period: `${days} days`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get security analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /security/export
 * @desc Export security data
 * @access Admin only
 */
router.post('/export', validateAPIKey, requireAdmin, (req, res) => {
  try {
    const { format = 'json' } = req.body;
    const securityData = advancedSecurity.exportSecurityData();
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = securityData.events.map(event => 
        `${event.timestamp.toISOString()},${event.type},${event.ip},${event.severity},${event.path}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="security-events.csv"');
      return res.send(csvData);
    }
    
    res.json({
      success: true,
      data: securityData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export security data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /security/config
 * @desc Get current security configuration
 * @access Admin only
 */
router.get('/config', validateAPIKey, requireAdmin, (req, res) => {
  try {
    const config = {
      apiKeyEnabled: process.env.API_KEY_ENABLED === 'true',
      rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS || '50',
      rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS || '900000',
      jwtEnabled: !!process.env.JWT_SECRET,
      corsOrigins: process.env.CORS_ORIGIN?.split(',') || [],
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get security configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 