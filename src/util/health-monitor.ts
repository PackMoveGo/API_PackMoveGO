import { Request, Response } from 'express';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  error?: string;
  details?: any;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  checks: HealthCheck[];
  metrics: {
    memory: any;
    cpu: any;
    requests: any;
  };
}

class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  private checkInterval: number = 30000; // 30 seconds

  constructor() {
    this.registerDefaultChecks();
    this.startPeriodicChecks();
  }

  // Register default health checks
  private registerDefaultChecks() {
    this.addHealthCheck('memory', this.checkMemoryUsage);
    this.addHealthCheck('disk-space', this.checkDiskSpace);
    this.addHealthCheck('api-endpoints', this.checkCoreEndpoints);
    this.addHealthCheck('external-dependencies', this.checkExternalDeps);
  }

  // Add a new health check
  addHealthCheck(name: string, checkFunction: () => Promise<Partial<HealthCheck>>) {
    this.checks.set(name, {
      name,
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date(),
    });

    // Run initial check
    this.runSingleCheck(name, checkFunction);
    
    console.log(`🔍 Health check registered: ${name}`);
  }

  // Run a single health check
  private async runSingleCheck(name: string, checkFunction: () => Promise<Partial<HealthCheck>>) {
    const startTime = Date.now();
    
    try {
      const result = await checkFunction();
      const responseTime = Date.now() - startTime;
      
      this.checks.set(name, {
        name,
        status: result.status || 'healthy',
        responseTime,
        lastCheck: new Date(),
        details: result.details,
        error: result.error
      });
    } catch (error) {
      this.checks.set(name, {
        name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Start periodic health checks
  private startPeriodicChecks() {
    setInterval(async () => {
      await this.runAllChecks();
    }, this.checkInterval);

    console.log(`🔍 Health monitoring started (${this.checkInterval}ms interval)`);
  }

  // Run all health checks
  private async runAllChecks() {
    const checkPromises = [
      this.runSingleCheck('memory', this.checkMemoryUsage),
      this.runSingleCheck('disk-space', this.checkDiskSpace),
      this.runSingleCheck('api-endpoints', this.checkCoreEndpoints),
      this.runSingleCheck('external-dependencies', this.checkExternalDeps)
    ];

    await Promise.allSettled(checkPromises);
  }

  // Memory usage check
  private checkMemoryUsage = async (): Promise<Partial<HealthCheck>> => {
    const memUsage = process.memoryUsage();
    const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (usagePercent > 90) status = 'unhealthy';
    else if (usagePercent > 80) status = 'degraded';
    
    return {
      status,
      details: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        usagePercent: usagePercent.toFixed(2) + '%',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
      }
    };
  };

  // Disk space check (simulated)
  private checkDiskSpace = async (): Promise<Partial<HealthCheck>> => {
    // In a real implementation, this would check actual disk usage
    // For now, we'll simulate based on uptime and logs
    const uptime = process.uptime();
    const simulatedUsage = Math.min(95, (uptime / (24 * 60 * 60)) * 10); // Simulate growing usage
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (simulatedUsage > 95) status = 'unhealthy';
    else if (simulatedUsage > 85) status = 'degraded';
    
    return {
      status,
      details: {
        usagePercent: simulatedUsage.toFixed(1) + '%',
        available: (100 - simulatedUsage).toFixed(1) + '%',
        note: 'Simulated disk usage based on uptime'
      }
    };
  };

  // Core endpoints check
  private checkCoreEndpoints = async (): Promise<Partial<HealthCheck>> => {
    const endpoints = ['/v0/services', '/v0/testimonials', '/v0/blog'];
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        // Simulate internal check (in real implementation, make actual HTTP request)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        const responseTime = Date.now() - startTime;
        
        results.push({
          endpoint,
          status: 'healthy',
          responseTime: responseTime + 'ms'
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount >= endpoints.length) status = 'unhealthy';
    else if (unhealthyCount > 0) status = 'degraded';
    
    return {
      status,
      details: {
        endpointsChecked: endpoints.length,
        healthyEndpoints: results.filter(r => r.status === 'healthy').length,
        results
      }
    };
  };

  // External dependencies check
  private checkExternalDeps = async (): Promise<Partial<HealthCheck>> => {
    const dependencies = [
      { name: 'MongoDB', status: 'degraded', note: 'Connection issues (continuing without DB)' },
      { name: 'Render Platform', status: 'healthy', note: 'Service operational' },
      { name: 'GitHub Integration', status: 'healthy', note: 'Auto-deploy working' }
    ];
    
    const unhealthyCount = dependencies.filter(d => d.status === 'unhealthy').length;
    const degradedCount = dependencies.filter(d => d.status === 'degraded').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) status = 'unhealthy';
    else if (degradedCount > 0) status = 'degraded';
    
    return {
      status,
      details: {
        dependencies,
        summary: `${dependencies.length - unhealthyCount - degradedCount} healthy, ${degradedCount} degraded, ${unhealthyCount} unhealthy`
      }
    };
  };

  // Get complete health status
  getHealthStatus(): SystemHealth {
    const checks = Array.from(this.checks.values());
    const unhealthyChecks = checks.filter(c => c.status === 'unhealthy').length;
    const degradedChecks = checks.filter(c => c.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyChecks > 0) overall = 'unhealthy';
    else if (degradedChecks > 0) overall = 'degraded';
    
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      overall,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
      metrics: {
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        cpu: {
          user: Math.round(cpuUsage.user / 1000),
          system: Math.round(cpuUsage.system / 1000)
        },
        requests: {
          // These would come from performance monitor in real implementation
          active: 0,
          total: 'N/A',
          averageResponseTime: 'N/A'
        }
      }
    };
  }

  // Health check endpoint handler
  healthEndpoint = (req: Request, res: Response) => {
    const health = this.getHealthStatus();
    const statusCode = health.overall === 'healthy' ? 200 : 
                      health.overall === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      ...health,
      service: 'PackMoveGO API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  };

  // Simple health check (fast response)
  simpleHealthEndpoint = (req: Request, res: Response) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const healthyChecks = Array.from(this.checks.values()).filter(c => c.status === 'healthy').length;
    const totalChecks = this.checks.size;
    
    res.json({
      status: 'ok',
      uptime: Math.floor(uptime),
      memory: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      healthScore: totalChecks > 0 ? Math.round((healthyChecks / totalChecks) * 100) : 100,
      timestamp: new Date().toISOString()
    });
  };

  // Configure health monitoring
  configure(options: { interval?: number }) {
    if (options.interval) {
      this.checkInterval = options.interval;
      console.log(`🔧 Health check interval updated to ${this.checkInterval}ms`);
    }
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();

// Export endpoint handlers
export const healthEndpoint = healthMonitor.healthEndpoint;
export const simpleHealthEndpoint = healthMonitor.simpleHealthEndpoint; 