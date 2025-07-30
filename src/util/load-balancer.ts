import { Request, Response, NextFunction } from 'express';
import { log } from './console-logger';

interface LoadBalancerConfig {
  enabled: boolean;
  instanceId: string;
  totalInstances: number;
  healthCheckInterval: number;
  sessionStickiness: boolean;
  stickySessions: Map<string, string>;
}

interface InstanceMetrics {
  instanceId: string;
  startTime: Date;
  requestsHandled: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHealthCheck: Date;
  status: 'healthy' | 'unhealthy' | 'starting';
}

class LoadBalancer {
  private config: LoadBalancerConfig;
  private metrics: InstanceMetrics;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enabled: process.env.ENABLE_LOAD_BALANCING === 'true',
      instanceId: process.env.INSTANCE_ID || `instance-${Date.now()}`,
      totalInstances: parseInt(process.env.TOTAL_INSTANCES || '1', 10),
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
      sessionStickiness: process.env.SESSION_STICKINESS === 'true',
      stickySessions: new Map()
    };

    this.metrics = {
      instanceId: this.config.instanceId,
      startTime: new Date(),
      requestsHandled: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastHealthCheck: new Date(),
      status: 'starting'
    };

    this.initializeLoadBalancer();
  }

  private initializeLoadBalancer() {
    if (!this.config.enabled) {
      log.info('system', 'Load balancing disabled - running in single instance mode');
      return;
    }

    log.info('system', `🚀 Load balancer initialized for instance: ${this.config.instanceId}`, { instanceId: this.config.instanceId });
    log.info('system', `📊 Total instances: ${this.config.totalInstances}`, { totalInstances: this.config.totalInstances });
    log.info('system', `🔗 Session stickiness: ${this.config.sessionStickiness ? 'enabled' : 'disabled'}`, { sessionStickiness: this.config.sessionStickiness });

    // Start health check monitoring
    this.startHealthCheck();
    
    // Update metrics periodically
    setInterval(() => {
      this.updateMetrics();
    }, 10000); // Every 10 seconds
  }

  private startHealthCheck() {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    log.info('system', `🏥 Health check monitoring started (interval: ${this.config.healthCheckInterval}ms)`);
  }

  private performHealthCheck() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.memoryUsage = memUsage.heapUsed / memUsage.heapTotal;
    this.metrics.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000;
    this.metrics.lastHealthCheck = new Date();

    // Determine health status based on metrics
    if (this.metrics.memoryUsage > 0.9 || this.metrics.cpuUsage > 80) {
      this.metrics.status = 'unhealthy';
      log.warn('system', `⚠️ Instance ${this.config.instanceId} showing unhealthy metrics`);
    } else {
      this.metrics.status = 'healthy';
    }

    log.debug('system', `🏥 Health check for ${this.config.instanceId}: ${this.metrics.status}`);
  }

  private updateMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / memUsage.heapTotal;
  }

  // Middleware to track requests and handle session stickiness
  public middleware = (req: Request, res: Response, next: NextFunction) => {
    if (!this.config.enabled) {
      return next();
    }

    const startTime = Date.now();
    this.metrics.requestsHandled++;

    // Handle session stickiness
    if (this.config.sessionStickiness) {
      const sessionId = req.headers['x-session-id'] as string || req.cookies?.sessionId;
      if (sessionId) {
        this.config.stickySessions.set(sessionId, this.config.instanceId);
      }
    }

    // Add instance information to response headers
    res.setHeader('X-Instance-ID', this.config.instanceId);
    res.setHeader('X-Instance-Start', this.metrics.startTime.toISOString());
    res.setHeader('X-Instance-Requests', this.metrics.requestsHandled.toString());

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      // Update average response time
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + responseTime) / 2;

      // Add response time to headers
      res.setHeader('X-Response-Time', `${responseTime}ms`);
    });

    next();
  };

  // Get current instance metrics
  public getMetrics(): InstanceMetrics {
    return { ...this.metrics };
  }

  // Get load balancer status
  public getStatus() {
    return {
      enabled: this.config.enabled,
      instanceId: this.config.instanceId,
      totalInstances: this.config.totalInstances,
      sessionStickiness: this.config.sessionStickiness,
      stickySessionsCount: this.config.stickySessions.size,
      metrics: this.getMetrics(),
      uptime: Date.now() - this.metrics.startTime.getTime(),
      memoryUsage: `${(this.metrics.memoryUsage * 100).toFixed(1)}%`,
      cpuUsage: `${this.metrics.cpuUsage.toFixed(1)}s`,
      requestsPerSecond: this.calculateRequestsPerSecond()
    };
  }

  private calculateRequestsPerSecond(): number {
    const uptimeSeconds = (Date.now() - this.metrics.startTime.getTime()) / 1000;
    return uptimeSeconds > 0 ? this.metrics.requestsHandled / uptimeSeconds : 0;
  }

  // Get instance information for client
  public getInstanceInfo() {
    return {
      instanceId: this.config.instanceId,
      startTime: this.metrics.startTime.toISOString(),
      uptime: Date.now() - this.metrics.startTime.getTime(),
      requestsHandled: this.metrics.requestsHandled,
      status: this.metrics.status
    };
  }

  // Cleanup method
  public cleanup() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    log.info('system', `🧹 Load balancer cleanup completed for ${this.config.instanceId}`);
  }
}

// Create singleton instance
const loadBalancer = new LoadBalancer();

export default loadBalancer; 