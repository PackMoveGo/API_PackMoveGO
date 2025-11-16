import { Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  slowQueries: Array<{
    path: string;
    method: string;
    duration: number;
    timestamp: string;
  }>;
  errors: Array<{
    path: string;
    method: string;
    error: string;
    timestamp: string;
  }>;
}

export interface PerformanceAlert {
  type: 'slow_response' | 'high_error_rate' | 'memory_usage' | 'cpu_usage';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  details: any;
}

export class APIPerformanceMonitor {
  private metrics: PerformanceMetrics;
  private alerts: PerformanceAlert[] = [];
  private startTime: number;
  private requestTimes: number[] = [];
  private errorCount: number = 0;
  private totalRequests: number = 0;
  private slowQueryThreshold: number = 1000; // 1 second
  private memoryThreshold: number = 0.8; // 80% of available memory
  // CPU threshold: 0.7 (70% CPU usage) - reserved for future use

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      throughput: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: 0,
      activeConnections: 0,
      slowQueries: [],
      errors: []
    };
  }

  /**
   * Middleware to monitor request performance
   */
  public monitorRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      // Request ID available in req.headers['x-request-id'] if needed

      // Track request start
      this.totalRequests++;
      this.metrics.requestCount++;

      // Monitor response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.recordRequest(duration, res.statusCode, req.path, req.method);

        // Log slow queries
        if (duration > this.slowQueryThreshold) {
          this.recordSlowQuery(req.path, req.method, duration);
        }

        // Log errors
        if (res.statusCode >= 400) {
          this.recordError(req.path, req.method, `HTTP ${res.statusCode}`);
        }
      });

      next();
    };
  }

  /**
   * Record request metrics
   */
  private recordRequest(duration: number, statusCode: number, _path: string, _method: string): void {
    this.requestTimes.push(duration);
    
    // Keep only last 1000 requests for average calculation
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }

    // Update metrics
    this.metrics.averageResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
    this.metrics.throughput = this.totalRequests / ((Date.now() - this.startTime) / 1000);

    if (statusCode >= 400) {
      this.errorCount++;
    }

    this.metrics.errorRate = (this.errorCount / this.totalRequests) * 100;
  }

  /**
   * Record slow query
   */
  private recordSlowQuery(path: string, method: string, duration: number): void {
    this.metrics.slowQueries.push({
      path,
      method,
      duration,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 slow queries
    if (this.metrics.slowQueries.length > 100) {
      this.metrics.slowQueries.shift();
    }

    // Generate alert
    this.generateAlert('slow_response', {
      path,
      method,
      duration,
      threshold: this.slowQueryThreshold
    });
  }

  /**
   * Record error
   */
  private recordError(path: string, method: string, error: string): void {
    this.metrics.errors.push({
      path,
      method,
      error,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Generate performance alert
   */
  private generateAlert(type: PerformanceAlert['type'], details: any): void {
    let message = '';
    let severity: PerformanceAlert['severity'] = 'low';

    switch (type) {
      case 'slow_response':
        message = `Slow response detected: ${details.path} (${details.duration}ms)`;
        severity = details.duration > 5000 ? 'critical' : details.duration > 2000 ? 'high' : 'medium';
        break;
      case 'high_error_rate':
        message = `High error rate detected: ${this.metrics.errorRate.toFixed(2)}%`;
        severity = this.metrics.errorRate > 10 ? 'critical' : this.metrics.errorRate > 5 ? 'high' : 'medium';
        break;
      case 'memory_usage':
        message = `High memory usage: ${(this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal * 100).toFixed(2)}%`;
        severity = 'high';
        break;
      case 'cpu_usage':
        message = `High CPU usage: ${(this.metrics.cpuUsage * 100).toFixed(2)}%`;
        severity = 'high';
        break;
    }

    const alert: PerformanceAlert = {
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      details
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    // Log critical alerts
    if (severity === 'critical') {
      console.error(`🚨 CRITICAL ALERT: ${message}`, details);
    } else if (severity === 'high') {
      console.warn(`⚠️ HIGH ALERT: ${message}`, details);
    }
  }

  /**
   * Update system metrics
   */
  public updateSystemMetrics(): void {
    // Update memory usage
    this.metrics.memoryUsage = process.memoryUsage();
    const memoryUsagePercent = this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal;

    if (memoryUsagePercent > this.memoryThreshold) {
      this.generateAlert('memory_usage', {
        usage: memoryUsagePercent,
        threshold: this.memoryThreshold
      });
    }

    // Update CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.metrics.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

    // Check error rate
    if (this.metrics.errorRate > 5) {
      this.generateAlert('high_error_rate', {
        errorRate: this.metrics.errorRate
      });
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get alerts
   */
  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 100;

    // Check response time
    if (this.metrics.averageResponseTime > 1000) {
      issues.push('High average response time');
      score -= 20;
    }

    // Check error rate
    if (this.metrics.errorRate > 5) {
      issues.push('High error rate');
      score -= 30;
    }

    // Check memory usage
    const memoryUsagePercent = this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal;
    if (memoryUsagePercent > 0.8) {
      issues.push('High memory usage');
      score -= 15;
    }

    // Check CPU usage
    if (this.metrics.cpuUsage > 0.7) {
      issues.push('High CPU usage');
      score -= 15;
    }

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 50) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, score, issues };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      throughput: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: 0,
      activeConnections: 0,
      slowQueries: [],
      errors: []
    };
    this.alerts = [];
    this.requestTimes = [];
    this.errorCount = 0;
    this.totalRequests = 0;
    this.startTime = Date.now();
  }
}

// Create singleton instance
export const apiPerformanceMonitor = new APIPerformanceMonitor();

// Update system metrics every 30 seconds
setInterval(() => {
  apiPerformanceMonitor.updateSystemMetrics();
}, 30000); 