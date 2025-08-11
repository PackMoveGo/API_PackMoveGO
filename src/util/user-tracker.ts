import { Request } from 'express';
import crypto from 'crypto';

interface UserSession {
  id: string;
  ip: string;
  userAgent: string;
  firstSeen: Date;
  lastSeen: Date;
  requestCount: number;
  isReconnected: boolean;
}

class UserTracker {
  private sessions = new Map<string, UserSession>();
  private ipToUserId = new Map<string, string>();

  /**
   * Get or create a user session
   */
  getUserSession(req: Request): UserSession {
    const ip = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    // Check if we have an existing session for this IP
    const existingUserId = this.ipToUserId.get(ip);
    
    if (existingUserId) {
      const existingSession = this.sessions.get(existingUserId);
      if (existingSession) {
        // Update existing session
        const wasReconnected = this.isReconnected(existingSession);
        existingSession.lastSeen = new Date();
        existingSession.requestCount++;
        existingSession.isReconnected = wasReconnected;
        
        return existingSession;
      }
    }
    
    // Create new session
    const userId = this.generateUserId();
    const session: UserSession = {
      id: userId,
      ip,
      userAgent,
      firstSeen: new Date(),
      lastSeen: new Date(),
      requestCount: 1,
      isReconnected: false
    };
    
    this.sessions.set(userId, session);
    this.ipToUserId.set(ip, userId);
    
    return session;
  }

  /**
   * Check if user has reconnected (gap > 5 minutes)
   */
  private isReconnected(session: UserSession): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - session.lastSeen.getTime();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return timeDiff > fiveMinutes;
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
           req.headers['x-real-ip']?.toString() || 
           req.headers['cf-connecting-ip']?.toString() ||
           req.headers['x-client-ip']?.toString() ||
           req.ip || 
           req.socket.remoteAddress || 
           'unknown';
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get user display info for logging
   */
  getUserDisplay(session: UserSession): string {
    if (session.isReconnected) {
      return `user:${session.id} (reconnected)`;
    }
    return `user:${session.id}`;
  }

  /**
   * Clean up old sessions (older than 24 hours)
   */
  cleanupOldSessions(): void {
    const now = new Date();
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    for (const [userId, session] of this.sessions.entries()) {
      const timeDiff = now.getTime() - session.lastSeen.getTime();
      if (timeDiff > twentyFourHours) {
        this.sessions.delete(userId);
        this.ipToUserId.delete(session.ip);
      }
    }
  }

  /**
   * Get session statistics
   */
  getStats(): { totalSessions: number; activeSessions: number } {
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;
    
    let activeSessions = 0;
    for (const session of this.sessions.values()) {
      const timeDiff = now.getTime() - session.lastSeen.getTime();
      if (timeDiff < fiveMinutes) {
        activeSessions++;
      }
    }
    
    return {
      totalSessions: this.sessions.size,
      activeSessions
    };
  }
}

// Export singleton instance
export const userTracker = new UserTracker();

// Clean up old sessions every hour
setInterval(() => {
  userTracker.cleanupOldSessions();
}, 60 * 60 * 1000); // 1 hour 