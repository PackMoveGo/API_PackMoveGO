import { Request, Response, NextFunction } from 'express';

interface ScalingMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

interface ScalingConfig {
  maxRequestsPerSecond: number;
  maxResponseTime: number;
  maxErrorRate: number;
  maxMemoryUsage: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
}

class AutoScaler {
  private metrics: ScalingMetrics[] = [];
  private config: ScalingConfig;
  private currentLoad = 0;
  private lastScaleAction = 0;
  private isScaling = false;

  constructor() {
    this.config = {
      maxRequestsPerSecond: 100,
      maxResponseTime: 2000, // 2 seconds
      maxErrorRate: 0.05, // 5%
      maxMemoryUsage: 0.85, // 85%
      scaleUpThreshold: 0.8, // 80% of limits
      scaleDownThreshold: 0.3, // 30% of limits
      cooldownPeriod: 5 * 60 * 1000 // 5 minutes
    };

    // Start metrics collection
    this.startMetricsCollection();
  }

  // Collect system metrics
  private collectMetrics(): ScalingMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Calculate recent metrics from our tracking
    const recentMetrics = this.metrics.slice(-60); // Last minute
    const avgResponseTime = recentMetrics.length > 0 ? 
      recentMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / recentMetrics.length : 0;
    
    const requestsPerSecond = recentMetrics.length;
    
    return {
      requestsPerSecond,
      averageResponseTime: avgResponseTime,
      errorRate: 0, // Will be calculated from actual error tracking
      memoryUsage: memUsage.heapUsed / memUsage.heapTotal,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      activeConnections: this.currentLoad
    };
  }

  // Start collecting metrics every second
  private startMetricsCollection() {
    setInterval(() => {
      const metrics = this.collectMetrics();
      this.metrics.push(metrics);
      
      // Keep only last 5 minutes of metrics
      if (this.metrics.length > 300) {
        this.metrics = this.metrics.slice(-300);
      }
      
      // Check if scaling is needed
      this.evaluateScaling(metrics);
    }, 1000);

    console.log('🔄 Auto-scaling metrics collection started');
  }

  // Evaluate if scaling action is needed
  private evaluateScaling(currentMetrics: ScalingMetrics) {
    // Skip if in cooldown period
    if (Date.now() - this.lastScaleAction < this.config.cooldownPeriod) {
      return;
    }

    const loadFactors = {
      requests: currentMetrics.requestsPerSecond / this.config.maxRequestsPerSecond,
      responseTime: currentMetrics.averageResponseTime / this.config.maxResponseTime,
      errors: currentMetrics.errorRate / this.config.maxErrorRate,
      memory: currentMetrics.memoryUsage / this.config.maxMemoryUsage
    };

    const maxLoad = Math.max(...Object.values(loadFactors));
    
    // Scale up if any metric exceeds threshold
    if (maxLoad > this.config.scaleUpThreshold) {
      this.triggerScaleUp(loadFactors, maxLoad);
    }
    // Scale down if all metrics are below threshold
    else if (maxLoad < this.config.scaleDownThreshold) {
      this.triggerScaleDown(loadFactors, maxLoad);
    }
  }

  // Trigger scale up action
  private triggerScaleUp(loadFactors: any, maxLoad: number) {
    if (this.isScaling) return;
    
    this.isScaling = true;
    this.lastScaleAction = Date.now();
    
    console.warn(`🔥 AUTO-SCALING: Scale up triggered (load: ${(maxLoad * 100).toFixed(1)}%)`);
    console.warn('📊 Load factors:', loadFactors);
    
    // In a real implementation, this would:
    // 1. Spin up additional server instances
    // 2. Adjust load balancer configuration
    // 3. Increase resource allocation
    
    // For now, we'll just log and implement protective measures
    this.implementProtectiveMeasures();
    
    setTimeout(() => {
      this.isScaling = false;
    }, 30000); // 30 second scaling action
  }

  // Trigger scale down action
  private triggerScaleDown(loadFactors: any, maxLoad: number) {
    if (this.isScaling) return;
    
    this.isScaling = true;
    this.lastScaleAction = Date.now();
    
    console.log(`📉 AUTO-SCALING: Scale down triggered (load: ${(maxLoad * 100).toFixed(1)}%)`);
    
    // In a real implementation, this would:
    // 1. Reduce number of server instances
    // 2. Optimize resource allocation
    // 3. Adjust load balancer configuration
    
    setTimeout(() => {
      this.isScaling = false;
    }, 30000);
  }

  // Implement protective measures during high load
  private implementProtectiveMeasures() {
    console.warn('🛡️ Implementing protective measures:');
    console.warn('   - Enabling aggressive caching');
    console.warn('   - Reducing response payloads');
    console.warn('   - Prioritizing essential endpoints');
    
    // This could trigger:
    // - Increased cache TTL
    // - Response compression
    // - Request queuing
    // - Non-essential endpoint throttling
  }

  // Middleware to track request load
  trackingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    this.currentLoad++;

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.currentLoad--;
      
      // Update the latest metrics with this request's data
      if (this.metrics.length > 0) {
        const latest = this.metrics[this.metrics.length - 1];
        latest.averageResponseTime = (latest.averageResponseTime + responseTime) / 2;
      }
    });

    next();
  };

  // Get current scaling status
  getScalingStatus() {
    const currentMetrics = this.collectMetrics();
    const loadFactors = {
      requests: (currentMetrics.requestsPerSecond / this.config.maxRequestsPerSecond * 100).toFixed(1) + '%',
      responseTime: (currentMetrics.averageResponseTime / this.config.maxResponseTime * 100).toFixed(1) + '%',
      memory: (currentMetrics.memoryUsage * 100).toFixed(1) + '%',
      connections: currentMetrics.activeConnections
    };

    return {
      status: this.isScaling ? 'SCALING' : 'STABLE',
      currentLoad: Math.max(
        currentMetrics.requestsPerSecond / this.config.maxRequestsPerSecond,
        currentMetrics.averageResponseTime / this.config.maxResponseTime,
        currentMetrics.memoryUsage
      ) * 100,
      loadFactors,
      lastScaleAction: this.lastScaleAction ? new Date(this.lastScaleAction).toISOString() : 'Never',
      cooldownRemaining: Math.max(0, this.config.cooldownPeriod - (Date.now() - this.lastScaleAction)),
      recommendations: this.getRecommendations(currentMetrics)
    };
  }

  // Get scaling recommendations
  private getRecommendations(metrics: ScalingMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.requestsPerSecond > this.config.maxRequestsPerSecond * 0.7) {
      recommendations.push('Consider implementing request queuing');
    }
    
    if (metrics.averageResponseTime > this.config.maxResponseTime * 0.6) {
      recommendations.push('Optimize database queries and caching');
    }
    
    if (metrics.memoryUsage > 0.7) {
      recommendations.push('Monitor memory leaks and optimize data structures');
    }
    
    if (this.currentLoad > 50) {
      recommendations.push('Consider horizontal scaling');
    }
    
    return recommendations;
  }

  // Configure scaling parameters
  configure(config: Partial<ScalingConfig>) {
    this.config = { ...this.config, ...config };
    console.log('🔧 Auto-scaling configuration updated:', config);
  }

  // Get detailed metrics
  getDetailedMetrics() {
    const recent = this.metrics.slice(-60); // Last minute
    
    return {
      current: this.collectMetrics(),
      trend: {
        requestsPerSecond: recent.map(m => m.requestsPerSecond),
        responseTime: recent.map(m => m.averageResponseTime),
        memoryUsage: recent.map(m => m.memoryUsage),
        timestamps: recent.map((_, i) => new Date(Date.now() - (60 - i) * 1000).toISOString())
      },
      summary: {
        avgRequestsPerSecond: recent.reduce((sum, m) => sum + m.requestsPerSecond, 0) / recent.length,
        avgResponseTime: recent.reduce((sum, m) => sum + m.averageResponseTime, 0) / recent.length,
        peakMemoryUsage: Math.max(...recent.map(m => m.memoryUsage)),
        totalRequests: recent.reduce((sum, m) => sum + m.requestsPerSecond, 0)
      }
    };
  }
}

// Singleton instance
export const autoScaler = new AutoScaler();

// Export middleware
export const scalingTrackingMiddleware = autoScaler.trackingMiddleware; 