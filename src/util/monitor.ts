import { getConnectionStatus } from '../config/database';

export interface ServerMetrics {
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  database: {
    connected: boolean;
    status: string;
  };
  requests: {
    total: number;
    errors: number;
    avgResponseTime: number;
  };
}

class ServerMonitor {
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private startTime = Date.now();

  recordRequest(responseTime: number, isError = false) {
    this.requestCount++;
    if (isError) {
      this.errorCount++;
    }
    
    // Keep only last 100 response times for average calculation
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  getMetrics(): ServerMetrics {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    return {
      uptime: Math.floor(uptime / 1000),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      database: {
        connected: getConnectionStatus(),
        status: getConnectionStatus() ? 'connected' : 'disconnected'
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        avgResponseTime: Math.round(avgResponseTime)
      }
    };
  }

  logMetrics() {
    const metrics = this.getMetrics();
    console.log('📊 Server Metrics:', {
      uptime: `${metrics.uptime}s`,
      memory: `${metrics.memory.heapUsed}MB / ${metrics.memory.heapTotal}MB`,
      database: metrics.database.status,
      requests: `${metrics.requests.total} (${metrics.requests.errors} errors)`,
      avgResponseTime: `${metrics.requests.avgResponseTime}ms`
    });
  }
}

export const serverMonitor = new ServerMonitor();

// Log metrics every 5 minutes
setInterval(() => {
  serverMonitor.logMetrics();
}, 5 * 60 * 1000);

export default serverMonitor; 