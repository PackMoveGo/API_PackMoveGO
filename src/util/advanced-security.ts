import { Request, Response, NextFunction } from 'express';

interface SecurityEvent {
  type: 'suspicious_request' | 'rate_limit_exceeded' | 'invalid_auth' | 'sql_injection' | 'xss_attempt';
  ip: string;
  userAgent: string;
  path: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
}

interface ThreatAnalysis {
  riskScore: number;
  patterns: string[];
  recommendation: string;
}

class AdvancedSecurity {
  private securityEvents: SecurityEvent[] = [];
  private blockedIPs: Set<string> = new Set();
  private suspiciousPatterns = [
    // SQL Injection patterns
    /(\'|\\\'|;|\\;|\||\\|\|\*|\\*|--|\\--)/i,
    /(union|select|insert|update|delete|drop|create|alter)/i,
    
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    
    // Path traversal
    /\.\.\//gi,
    /\.\.\\/gi,
    
    // Command injection
    /;|\||&|\$\(|\`/i,
    
    // File inclusion
    /php:\/\/|file:\/\/|data:\/\//i
  ];

  // Advanced request analysis
  analyzeRequest(req: Request): ThreatAnalysis {
    let riskScore = 0;
    const patterns: string[] = [];
    
    const requestData = {
      url: req.url,
      body: JSON.stringify(req.body),
      query: JSON.stringify(req.query),
      headers: JSON.stringify(req.headers)
    };
    
    const fullRequestString = Object.values(requestData).join(' ');
    
    // Check for suspicious patterns
    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(fullRequestString)) {
        riskScore += 10;
        patterns.push(`Pattern_${index + 1}`);
      }
    });
    
    // Check for excessive request size
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 1024 * 1024) {
      riskScore += 5;
      patterns.push('Large_Request');
    }
    
    // Check for suspicious user agents
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent === '') {
      riskScore += 3;
      patterns.push('Suspicious_User_Agent');
    }
    
    // Check for rapid requests from same IP
    const recentEvents = this.securityEvents.filter(event => 
      event.ip === this.getClientIP(req) && 
      Date.now() - event.timestamp.getTime() < 60000 // Last minute
    );
    
    if (recentEvents.length > 10) {
      riskScore += 15;
      patterns.push('Rapid_Requests');
    }
    
    let recommendation = 'allow';
    if (riskScore > 20) {
      recommendation = 'block';
    } else if (riskScore > 10) {
      recommendation = 'monitor';
    }
    
    return { riskScore, patterns, recommendation };
  }

  // Security middleware
  securityAnalysisMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const clientIP = this.getClientIP(req);
    
    // Check if IP is blocked
    if (this.blockedIPs.has(clientIP)) {
      this.logSecurityEvent({
        type: 'suspicious_request',
        ip: clientIP,
        userAgent: req.get('User-Agent') || '',
        path: req.path,
        timestamp: new Date(),
        severity: 'high',
        details: 'Blocked IP attempted access'
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Your IP has been temporarily blocked due to suspicious activity',
        timestamp: new Date().toISOString()
      });
    }
    
    // Analyze request for threats
    const analysis = this.analyzeRequest(req);
    
    if (analysis.recommendation === 'block') {
      this.logSecurityEvent({
        type: 'suspicious_request',
        ip: clientIP,
        userAgent: req.get('User-Agent') || '',
        path: req.path,
        timestamp: new Date(),
        severity: 'critical',
        details: { riskScore: analysis.riskScore, patterns: analysis.patterns }
      });
      
      // Temporarily block IP for high-risk requests
      this.blockIP(clientIP, 300000); // 5 minutes
      
      return res.status(403).json({
        success: false,
        error: 'Security violation detected',
        message: 'Request blocked due to suspicious patterns',
        timestamp: new Date().toISOString()
      });
    }
    
    if (analysis.recommendation === 'monitor') {
      this.logSecurityEvent({
        type: 'suspicious_request',
        ip: clientIP,
        userAgent: req.get('User-Agent') || '',
        path: req.path,
        timestamp: new Date(),
        severity: 'medium',
        details: { riskScore: analysis.riskScore, patterns: analysis.patterns }
      });
    }
    
    next();
  };

  private getClientIP(req: Request): string {
    let clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                   req.headers['x-real-ip']?.toString() || 
                   req.headers['cf-connecting-ip']?.toString() ||
                   req.headers['x-client-ip']?.toString() ||
                   req.socket.remoteAddress || '';
    
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }
    
    return clientIp;
  }

  private logSecurityEvent(event: SecurityEvent) {
    this.securityEvents.push(event);
    
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }
    
    // Log based on severity
    const timestamp = event.timestamp.toISOString();
    switch (event.severity) {
      case 'critical':
        console.error(`🚨 CRITICAL SECURITY EVENT [${timestamp}]: ${event.type} from ${event.ip} on ${event.path}`);
        break;
      case 'high':
        console.warn(`⚠️ HIGH SECURITY EVENT [${timestamp}]: ${event.type} from ${event.ip} on ${event.path}`);
        break;
      case 'medium':
        console.warn(`🔍 MEDIUM SECURITY EVENT [${timestamp}]: ${event.type} from ${event.ip} on ${event.path}`);
        break;
      case 'low':
        console.log(`📝 LOW SECURITY EVENT [${timestamp}]: ${event.type} from ${event.ip} on ${event.path}`);
        break;
    }
  }

  private blockIP(ip: string, duration: number) {
    this.blockedIPs.add(ip);
    console.warn(`🚫 IP ${ip} temporarily blocked for ${duration / 1000} seconds`);
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      console.log(`✅ IP ${ip} unblocked`);
    }, duration);
  }

  // Get security statistics
  getSecurityStats() {
    const now = new Date();
    const last24Hours = this.securityEvents.filter(event => 
      now.getTime() - event.timestamp.getTime() < 24 * 60 * 60 * 1000
    );
    
    const eventsByType = last24Hours.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const eventsBySeverity = last24Hours.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalEvents24h: last24Hours.length,
      blockedIPs: Array.from(this.blockedIPs),
      eventsByType,
      eventsBySeverity,
      recentEvents: this.securityEvents.slice(-10),
      timestamp: now.toISOString()
    };
  }

  // Manual IP management
  manualBlockIP(ip: string, reason: string) {
    this.blockedIPs.add(ip);
    this.logSecurityEvent({
      type: 'suspicious_request',
      ip,
      userAgent: 'Manual Block',
      path: '/admin/block',
      timestamp: new Date(),
      severity: 'high',
      details: { reason, manually_blocked: true }
    });
    console.warn(`🔒 IP ${ip} manually blocked: ${reason}`);
  }

  manualUnblockIP(ip: string) {
    this.blockedIPs.delete(ip);
    console.log(`🔓 IP ${ip} manually unblocked`);
  }

  // Export security data
  exportSecurityData() {
    return {
      events: this.securityEvents,
      blockedIPs: Array.from(this.blockedIPs),
      exported: new Date().toISOString()
    };
  }
}

// Singleton instance
export const advancedSecurity = new AdvancedSecurity();

// Export middleware
export const securityAnalysisMiddleware = advancedSecurity.securityAnalysisMiddleware; 