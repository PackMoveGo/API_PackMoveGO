import { Server, Socket } from 'socket.io';
import { Request, Response } from 'express';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  city?: string;
  state?: string;
  country?: string;
  ip?: string;
}

export interface UserInteraction {
  type: 'page_view' | 'click' | 'scroll' | 'form_submit' | 'api_call' | 'error';
  page: string;
  element?: string;
  data?: any;
  timestamp: number;
  sessionId: string;
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  socketId: string;
  ip: string;
  userAgent: string;
  location?: UserLocation;
  interactions: UserInteraction[];
  startTime: number;
  lastActivity: number;
  isActive: boolean;
  deviceInfo?: {
    platform: string;
    browser: string;
    screenSize: string;
    language: string;
  };
}

class UserTracker {
  private io: Server;
  private sessions: Map<string, UserSession> = new Map();
  private userSessions: Map<string, string[]> = new Map(); // userId -> sessionIds
  private locationCache: Map<string, UserLocation> = new Map(); // ip -> location

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
    this.startCleanupInterval();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('🔍 User tracker: New socket connection:', socket.id);
      
      // Handle user session creation
      socket.on('user:session:start', (data: {
        sessionId: string;
        userId?: string;
        userEmail?: string;
        userRole?: string;
        deviceInfo?: any;
      }) => {
        this.createUserSession(socket, data);
      });

      // Handle location updates
      socket.on('user:location:update', (location: UserLocation) => {
        this.updateUserLocation(socket.id, location);
      });

      // Handle user interactions
      socket.on('user:interaction', (interaction: Omit<UserInteraction, 'timestamp' | 'sessionId'>) => {
        this.recordUserInteraction(socket.id, interaction);
      });

      // Handle page views
      socket.on('user:page:view', (data: { page: string; referrer?: string }) => {
        this.recordPageView(socket.id, data);
      });

      // Handle ping/pong for activity tracking
      socket.on('user:ping', () => {
        this.handleUserPing(socket.id);
        socket.emit('user:pong', { timestamp: Date.now() });
      });

      // Handle user activity
      socket.on('user:activity', (data: { type: string; details?: any }) => {
        this.recordUserActivity(socket.id, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleUserDisconnect(socket.id);
      });
    });
  }

  private createUserSession(socket: Socket, data: {
    sessionId: string;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    deviceInfo?: any;
  }) {
    const session: UserSession = {
      sessionId: data.sessionId,
      userId: data.userId,
      userEmail: data.userEmail,
      userRole: data.userRole,
      socketId: socket.id,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || '',
      interactions: [],
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      deviceInfo: data.deviceInfo
    };

    this.sessions.set(socket.id, session);

    // Track user sessions
    if (data.userId) {
      if (!this.userSessions.has(data.userId)) {
        this.userSessions.set(data.userId, []);
      }
      this.userSessions.get(data.userId)!.push(data.sessionId);
    }

    console.log('📊 User session created:', {
      sessionId: data.sessionId,
      userId: data.userId,
      socketId: socket.id
    });

    // Emit session created event
    socket.emit('user:session:created', {
      sessionId: data.sessionId,
      timestamp: Date.now()
    });
  }

  private updateUserLocation(socketId: string, location: UserLocation) {
    const session = this.sessions.get(socketId);
    if (session) {
      session.location = {
        ...location,
        timestamp: Date.now()
      };
      session.lastActivity = Date.now();

      // Cache location by IP
      this.locationCache.set(session.ip, session.location);

      console.log('📍 Location updated for session:', {
        sessionId: session.sessionId,
        location: `${location.latitude}, ${location.longitude}`,
        city: location.city
      });

      // Emit location update to admins
      this.io.to('admin:room').emit('user:location:updated', {
        sessionId: session.sessionId,
        userId: session.userId,
        location: session.location
      });
    }
  }

  private recordUserInteraction(socketId: string, interaction: Omit<UserInteraction, 'timestamp' | 'sessionId'>) {
    const session = this.sessions.get(socketId);
    if (session) {
      const fullInteraction: UserInteraction = {
        ...interaction,
        timestamp: Date.now(),
        sessionId: session.sessionId
      };

      session.interactions.push(fullInteraction);
      session.lastActivity = Date.now();

      console.log('🖱️ User interaction recorded:', {
        sessionId: session.sessionId,
        type: interaction.type,
        page: interaction.page
      });

      // Emit interaction to admins
      this.io.to('admin:room').emit('user:interaction:recorded', {
        sessionId: session.sessionId,
        userId: session.userId,
        interaction: fullInteraction
      });
    }
  }

  private recordPageView(socketId: string, data: { page: string; referrer?: string }) {
    const session = this.sessions.get(socketId);
    if (session) {
      const pageView: UserInteraction = {
        type: 'page_view',
        page: data.page,
        data: { referrer: data.referrer },
        timestamp: Date.now(),
        sessionId: session.sessionId
      };

      session.interactions.push(pageView);
      session.lastActivity = Date.now();

      console.log('📄 Page view recorded:', {
        sessionId: session.sessionId,
        page: data.page,
        referrer: data.referrer
      });

      // Emit page view to admins
      this.io.to('admin:room').emit('user:page:viewed', {
        sessionId: session.sessionId,
        userId: session.userId,
        page: data.page,
        referrer: data.referrer
      });
    }
  }

  private handleUserPing(socketId: string) {
    const session = this.sessions.get(socketId);
    if (session) {
      session.lastActivity = Date.now();
      session.isActive = true;

      // Emit ping to admins
      this.io.to('admin:room').emit('user:pinged', {
        sessionId: session.sessionId,
        userId: session.userId,
        timestamp: Date.now()
      });
    }
  }

  private recordUserActivity(socketId: string, data: { type: string; details?: any }) {
    const session = this.sessions.get(socketId);
    if (session) {
      const activity: UserInteraction = {
        type: 'click',
        page: 'unknown',
        data: data.details,
        timestamp: Date.now(),
        sessionId: session.sessionId
      };

      session.interactions.push(activity);
      session.lastActivity = Date.now();

      console.log('🎯 User activity recorded:', {
        sessionId: session.sessionId,
        type: data.type
      });
    }
  }

  private handleUserDisconnect(socketId: string) {
    const session = this.sessions.get(socketId);
    if (session) {
      session.isActive = false;
      session.lastActivity = Date.now();

      console.log('👋 User disconnected:', {
        sessionId: session.sessionId,
        userId: session.userId,
        duration: Date.now() - session.startTime
      });

      // Emit disconnect to admins
      this.io.to('admin:room').emit('user:disconnected', {
        sessionId: session.sessionId,
        userId: session.userId,
        duration: Date.now() - session.startTime
      });

      // Clean up after delay
      setTimeout(() => {
        this.sessions.delete(socketId);
      }, 300000); // 5 minutes
    }
  }

  private startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

      for (const [socketId, session] of this.sessions.entries()) {
        if (now - session.lastActivity > inactiveThreshold) {
          session.isActive = false;
          console.log('⏰ Session marked inactive:', session.sessionId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Public methods for analytics
  public getActiveSessions(): UserSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  public getUserSession(userId: string): UserSession[] {
    const sessionIds = this.userSessions.get(userId) || [];
    return sessionIds
      .map(sessionId => Array.from(this.sessions.values()).find(s => s.sessionId === sessionId))
      .filter(Boolean) as UserSession[];
  }

  public getSessionAnalytics(): {
    totalSessions: number;
    activeSessions: number;
    totalUsers: number;
    averageSessionDuration: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(s => s.isActive);
    const uniqueUsers = new Set(sessions.map(s => s.userId).filter(Boolean));
    const avgDuration = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (Date.now() - s.startTime), 0) / sessions.length
      : 0;

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalUsers: uniqueUsers.size,
      averageSessionDuration: avgDuration
    };
  }

  public getLocationAnalytics(): {
    locations: Map<string, number>;
    countries: Map<string, number>;
    cities: Map<string, number>;
  } {
    const locations = new Map<string, number>();
    const countries = new Map<string, number>();
    const cities = new Map<string, number>();

    for (const session of this.sessions.values()) {
      if (session.location) {
        const locationKey = `${session.location.latitude},${session.location.longitude}`;
        locations.set(locationKey, (locations.get(locationKey) || 0) + 1);

        if (session.location.country) {
          countries.set(session.location.country, (countries.get(session.location.country) || 0) + 1);
        }

        if (session.location.city) {
          cities.set(session.location.city, (cities.get(session.location.city) || 0) + 1);
        }
      }
    }

    return { locations, countries, cities };
  }
}

export default UserTracker; 