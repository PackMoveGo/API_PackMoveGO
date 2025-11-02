import express from 'express';
import { performanceMonitor } from '../util/performance-monitor';
import { advancedSecurity } from '../util/advanced-security';
// import { loadBalancer } from '../util/load-balancer'; // Temporarily disabled
import { advancedCache } from '../util/caching-system';
import { compressionManager } from '../util/compression-middleware';
import { backupSystem } from '../util/backup-system';

const router = express.Router();

// Admin authentication middleware
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = (Array.isArray(req.headers['x-api-key']) ? req.headers['x-api-key'][0] : req.headers['x-api-key']) || 
                 req.headers['authorization']?.replace('Bearer ', '');
  
  if (apiKey !== process.env.API_KEY_ADMIN) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      message: 'This endpoint requires admin API key',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Apply admin auth to all routes
router.use(requireAdmin);

// === SYSTEM OVERVIEW ===
router.get('/admin/overview', (req, res) => {
  try {
    const overview = {
      systemInfo: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      },
      performance: performanceMonitor.getRealTimeStats(),
      security: advancedSecurity.getSecurityStats(),
      // loadBalancer: loadBalancer.getStats(), // Temporarily disabled
      cache: advancedCache.getStats(),
      compression: compressionManager.getStats()
    };

    res.json({
      success: true,
      data: overview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system overview',
      timestamp: new Date().toISOString()
    });
  }
});

// === CACHE MANAGEMENT ===
router.delete('/admin/cache/clear', (req, res) => {
  try {
    advancedCache.clear();
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    });
  }
});

router.delete('/admin/cache/pattern/:pattern', (req, res) => {
  try {
    const pattern = req.params.pattern;
    const deleted = advancedCache.invalidatePattern(pattern);
    res.json({
      success: true,
      message: `Invalidated ${deleted} cache entries`,
      pattern,
      deletedCount: deleted,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache pattern',
      timestamp: new Date().toISOString()
    });
  }
});

// === SECURITY MANAGEMENT ===
router.post('/admin/security/block-ip', (req, res) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address required',
        timestamp: new Date().toISOString()
      });
    }

    advancedSecurity.manualBlockIP(ip, reason || 'Manually blocked by admin');
    res.json({
      success: true,
      message: `IP ${ip} has been blocked`,
      ip,
      reason,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to block IP',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/admin/security/unblock-ip', (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address required',
        timestamp: new Date().toISOString()
      });
    }

    advancedSecurity.manualUnblockIP(ip);
    res.json({
      success: true,
      message: `IP ${ip} has been unblocked`,
      ip,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to unblock IP',
      timestamp: new Date().toISOString()
    });
  }
});

// === LOAD BALANCER MANAGEMENT === (Temporarily disabled)
// Load balancer management will be added in next update

// === BACKUP MANAGEMENT ===
router.post('/admin/backup/create', async (req, res) => {
  try {
    const filename = await backupSystem.createBackup();
    res.json({
      success: true,
      message: 'Backup created successfully',
      filename,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create backup',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/admin/backup/list', async (req, res) => {
  try {
    const backups = await backupSystem.getBackupList();
    res.json({
      success: true,
      data: backups,
      count: backups.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get backup list',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/admin/backup/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const backupData = await backupSystem.exportBackup(filename);
    
    if (!backupData) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found',
        timestamp: new Date().toISOString()
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(backupData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to download backup',
      timestamp: new Date().toISOString()
    });
  }
});

// === SYSTEM CONTROLS ===
router.post('/admin/system/restart', (req, res) => {
  res.json({
    success: true,
    message: 'System restart initiated',
    warning: 'Service will be unavailable briefly',
    timestamp: new Date().toISOString()
  });
  
  // Graceful restart after response
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

router.get('/admin/system/logs', (req, res) => {
  try {
    const logs = {
      performance: performanceMonitor.getSummary(),
      security: advancedSecurity.getSecurityStats(),
      systemHealth: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    res.json({
      success: true,
      data: logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system logs',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 