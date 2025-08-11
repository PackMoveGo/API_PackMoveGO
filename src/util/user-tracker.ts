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
  visitCount: number;
  userType: 'new' | 'returning' | 'frequent' | 'bot';
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
        
        // Update user type based on visit count
        existingSession.visitCount++;
        existingSession.userType = this.determineUserType(existingSession);
        
        return existingSession;
      }
    }
    
    // Create new session
    const userId = this.generateUserId();
    const userType = this.detectBot(userAgent) ? 'bot' : 'new';
    const session: UserSession = {
      id: userId,
      ip,
      userAgent,
      firstSeen: new Date(),
      lastSeen: new Date(),
      requestCount: 1,
      isReconnected: false,
      visitCount: 1,
      userType
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
   * Determine user type based on visit count and behavior
   */
  private determineUserType(session: UserSession): 'new' | 'returning' | 'frequent' | 'bot' {
    if (session.userType === 'bot') return 'bot';
    if (session.visitCount >= 10) return 'frequent';
    if (session.visitCount >= 2) return 'returning';
    return 'new';
  }

  /**
   * Detect if user agent indicates a bot
   */
  private detectBot(userAgent: string): boolean {
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'vercel-screenshot',
      'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'facebookexternalhit',
      'twitterbot', 'linkedinbot', 'whatsapp', 'telegrambot'
    ];
    
    const lowerUA = userAgent.toLowerCase();
    return botPatterns.some(pattern => lowerUA.includes(pattern));
  }

  /**
   * Get emoji indicator for user type
   */
  private getUserTypeEmoji(userType: string): string {
    switch (userType) {
      case 'new': return '🆕';
      case 'returning': return '👋';
      case 'frequent': return '⭐';
      case 'bot': return '🤖';
      default: return '👤';
    }
  }

  /**
   * Get user display info for logging with emoji indicators
   */
  getUserDisplay(session: UserSession): string {
    const emoji = this.getUserTypeEmoji(session.userType);
    const baseDisplay = `user:${session.id}`;
    
    if (session.userType === 'bot') {
      return `${emoji} ${baseDisplay} (bot)`;
    }
    
    if (session.isReconnected) {
      return `${emoji} ${baseDisplay} (reconnected, visit #${session.visitCount})`;
    }
    
    if (session.visitCount > 1) {
      return `${emoji} ${baseDisplay} (visit #${session.visitCount})`;
    }
    
    return `${emoji} ${baseDisplay}`;
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
   * Get session statistics with user type breakdown
   */
  getStats(): { 
    totalSessions: number; 
    activeSessions: number;
    userTypes: { [key: string]: number };
    emojiStats: string;
  } {
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;
    
    let activeSessions = 0;
    const userTypes: { [key: string]: number } = {
      new: 0,
      returning: 0,
      frequent: 0,
      bot: 0
    };
    
    for (const session of this.sessions.values()) {
      const timeDiff = now.getTime() - session.lastSeen.getTime();
      if (timeDiff < fiveMinutes) {
        activeSessions++;
      }
      userTypes[session.userType]++;
    }
    
    const emojiStats = `🆕${userTypes.new} 👋${userTypes.returning} ⭐${userTypes.frequent} 🤖${userTypes.bot}`;
    
    return {
      totalSessions: this.sessions.size,
      activeSessions,
      userTypes,
      emojiStats
    };
  }
}

// Export singleton instance
export const userTracker = new UserTracker();

// Clean up old sessions every hour
setInterval(() => {
  userTracker.cleanupOldSessions();
}, 60 * 60 * 1000); // 1 hour 