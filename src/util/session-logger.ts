import { Request, Response, NextFunction } from 'express';
import { consoleLogger } from './console-logger';

interface SessionLog {
  timestamp: string;
  sessionId: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  statusCode?: number;
  responseTime?: number;
  userId?: string;
  error?: string;
}

class SessionLogger {
  private sessions: Map<string, SessionLog[]> = new Map();
  private requestStartTimes: Map<string, number> = new Map();

  // Generate session ID from request
  private generateSessionId(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    return `${ip}-${Date.now()}-${userAgent.substring(0, 20)}`.replace(/[^a-zA-Z0-9-]/g, '_');
  }

  // Middleware to log session activity
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sessionId = this.generateSessionId(req);
      const timestamp = new Date().toISOString();
      const requestId = `${sessionId}-${Date.now()}`;

      // Store request start time
      this.requestStartTimes.set(requestId, Date.now());

      // Create session log entry
      const logEntry: SessionLog = {
        timestamp,
        sessionId,
        method: req.method,
        path: req.path,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      };

      // Add to session history
      if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, []);
      }
      this.sessions.get(sessionId)!.push(logEntry);

      // Log the request with separator
      console.log('\n' + '─'.repeat(80));
      consoleLogger.info('session', `[${timestamp}] ${req.method} ${req.path}`, {
        sessionId,
        ip: logEntry.ip,
        userAgent: logEntry.userAgent.substring(0, 50)
      });

      // Capture response
      const originalSend = res.send;
      res.send = function (data: any) {
        const responseTime = Date.now() - sessionLogger.requestStartTimes.get(requestId)!;
        sessionLogger.requestStartTimes.delete(requestId);

        // Update log entry with response data
        logEntry.statusCode = res.statusCode;
        logEntry.responseTime = responseTime;

        // Special alert for Forbidden (403) responses
        if (res.statusCode === 403) {
          console.error('\n⚠️  ALERT: FORBIDDEN REQUEST ⚠️');
          console.error('┄'.repeat(80));
          console.error('Timestamp:', timestamp);
          console.error('Method:', req.method);
          console.error('Path:', req.path);
          console.error('IP Address:', logEntry.ip);
          console.error('User Agent:', logEntry.userAgent.substring(0, 60));
          console.error('Response Time:', `${responseTime}ms`);
          console.error('Status Code:', res.statusCode);
          console.error('Message: Access forbidden - Invalid or missing credentials');
          console.error('┄'.repeat(80) + '\n');
        }

        // Log the response
        const logLevel = res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'info';
        consoleLogger[logLevel]('session', `[${timestamp}] ${res.statusCode} ${req.method} ${req.path} - ${responseTime}ms`, {
          sessionId,
          statusCode: res.statusCode,
          responseTime: `${responseTime}ms`
        });
        console.log('─'.repeat(80) + '\n');

        return originalSend.call(this, data);
      };

      // Capture errors
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          logEntry.error = `HTTP ${res.statusCode}`;
        }
      });

      next();
    };
  }

  // Log a custom session event
  logEvent(sessionId: string, event: string, data?: any) {
    const timestamp = new Date().toISOString();
    consoleLogger.info('session', `[${timestamp}] ${event}`, {
      sessionId,
      ...data
    });
  }

  // Get session history
  getSessionHistory(sessionId: string): SessionLog[] {
    return this.sessions.get(sessionId) || [];
  }

  // Clear old sessions (cleanup)
  cleanup(maxAge: number = 3600000) {
    const now = Date.now();
    for (const [sessionId, logs] of this.sessions.entries()) {
      const lastLog = logs[logs.length - 1];
      const lastActivity = new Date(lastLog.timestamp).getTime();
      if (now - lastActivity > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get all active sessions
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  // Get session stats
  getStats(): {
    totalSessions: number;
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
  } {
    let totalRequests = 0;
    let totalResponseTime = 0;
    let totalErrors = 0;
    let requestsWithTime = 0;

    for (const logs of this.sessions.values()) {
      totalRequests += logs.length;
      for (const log of logs) {
        if (log.responseTime) {
          totalResponseTime += log.responseTime;
          requestsWithTime++;
        }
        if (log.error || (log.statusCode && log.statusCode >= 400)) {
          totalErrors++;
        }
      }
    }

    return {
      totalSessions: this.sessions.size,
      totalRequests,
      avgResponseTime: requestsWithTime > 0 ? Math.round(totalResponseTime / requestsWithTime) : 0,
      errorRate: totalRequests > 0 ? Number((totalErrors / totalRequests * 100).toFixed(2)) : 0
    };
  }

  // Log stats periodically
  startPeriodicLogging(interval: number = 300000) {
    setInterval(() => {
      const stats = this.getStats();
      consoleLogger.info('session', '📊 Session Stats', stats);
      this.cleanup();
    }, interval);
  }
}

export const sessionLogger = new SessionLogger();
export default sessionLogger;

