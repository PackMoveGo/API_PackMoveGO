import { Server, Socket } from 'socket.io';
import JWTUtils from './jwt-utils';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  isAuthenticated?: boolean;
}

class SocketUtils {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupAuthentication();
    this.setupEventHandlers();
  }

  private setupAuthentication() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      const token = (socket.handshake.auth as any)['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow anonymous connections for user tracking
        console.log('🔌 Anonymous socket connection allowed for tracking');
        (socket as AuthenticatedSocket).isAuthenticated = false;
        return next();
      }

      try {
        const decoded = await JWTUtils.verifyToken(token);
        if (decoded) {
          (socket as AuthenticatedSocket).userId = decoded.userId;
          (socket as AuthenticatedSocket).userEmail = decoded.email;
          (socket as AuthenticatedSocket).userRole = decoded.role;
          (socket as AuthenticatedSocket).isAuthenticated = true;
          console.log('✅ Socket authentication successful for:', decoded.email);
          next();
        } else {
          console.log('❌ Socket connection rejected: Invalid token');
          return next(new Error('Invalid token'));
        }
      } catch (error) {
        console.log('❌ Socket connection rejected: Token verification failed');
        return next(new Error('Token verification failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log('🔌 Socket connected:', socket.id, socket.isAuthenticated ? '(authenticated)' : '(anonymous)');

      // Handle authentication status
      socket.on('auth:status', () => {
        socket.emit('auth:status', {
          authenticated: socket.isAuthenticated || false,
          user: socket.isAuthenticated ? {
            userId: socket.userId,
            email: socket.userEmail,
            role: socket.userRole
          } : null
        });
      });

      // Handle user events
      socket.on('user:join', (data) => {
        if (socket.isAuthenticated) {
          socket.join(`user:${socket.userId}`);
          socket.emit('user:joined', { userId: socket.userId });
          console.log(`👤 User ${socket.userEmail} joined user room`);
        } else {
          // Allow anonymous users to join tracking
          socket.join('tracking:anonymous');
          socket.emit('user:joined', { userId: 'anonymous', sessionId: data?.sessionId });
          console.log(`👤 Anonymous user joined tracking room`);
        }
      });

      // Handle admin events
      socket.on('admin:join', () => {
        if (socket.isAuthenticated && socket.userRole === 'admin') {
          socket.join('admin:room');
          socket.emit('admin:joined');
          console.log(`👑 Admin ${socket.userEmail} joined admin room`);
        } else {
          socket.emit('admin:denied', { message: 'Admin access required' });
        }
      });

      // Handle real-time updates
      socket.on('update:request', (data) => {
        if (socket.isAuthenticated) {
          // Broadcast to appropriate rooms
          if (socket.userRole === 'admin') {
            this.io.to('admin:room').emit('update:broadcast', {
              ...data,
              userId: socket.userId,
              userEmail: socket.userEmail
            });
          }
        }
      });

      // Handle booking tracking
      socket.on('tracking:join', (bookingId: string) => {
        if (socket.isAuthenticated) {
          socket.join(`tracking:${bookingId}`);
          socket.emit('tracking:joined', { bookingId });
          console.log(`📍 User ${socket.userEmail} joined tracking room for booking ${bookingId}`);
        }
      });

      socket.on('tracking:update', (data) => {
        if (socket.isAuthenticated) {
          const { bookingId, location, status } = data;
          // Broadcast tracking update to all users tracking this booking
          this.io.to(`tracking:${bookingId}`).emit('tracking:updated', {
            bookingId,
            location,
            status,
            timestamp: new Date().toISOString()
          });
          console.log(`📍 Tracking update for booking ${bookingId}:`, data);
        }
      });

      // Handle chat functionality
      socket.on('chat:join', (conversationId: string) => {
        if (socket.isAuthenticated) {
          socket.join(`chat:${conversationId}`);
          socket.emit('chat:joined', { conversationId });
          console.log(`💬 User ${socket.userEmail} joined chat room ${conversationId}`);
        }
      });

      socket.on('chat:message', (data) => {
        if (socket.isAuthenticated) {
          const { conversationId, message, senderType = 'customer' } = data;
          // Broadcast message to all users in the conversation
          this.io.to(`chat:${conversationId}`).emit('chat:message', {
            conversationId,
            message,
            senderId: socket.userId,
            senderType,
            timestamp: new Date().toISOString()
          });
          console.log(`💬 Message in conversation ${conversationId}:`, message);
        }
      });

      socket.on('chat:typing', (data) => {
        if (socket.isAuthenticated) {
          const { conversationId, isTyping } = data;
          // Broadcast typing indicator to other users in the conversation
          socket.to(`chat:${conversationId}`).emit('chat:typing', {
            conversationId,
            userId: socket.userId,
            isTyping,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle mover location updates
      socket.on('mover:location', (data) => {
        if (socket.isAuthenticated && socket.userRole === 'admin') {
          const { moverId, location } = data;
          // Broadcast mover location to admin room
          this.io.to('admin:room').emit('mover:location:updated', {
            moverId,
            location,
            timestamp: new Date().toISOString()
          });
          console.log(`🚚 Mover ${moverId} location updated:`, location);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
      });
    });
  }

  // Public methods for external use
  public broadcastToUsers(event: string, data: any) {
    this.io.emit(event, data);
  }

  public broadcastToAdmins(event: string, data: any) {
    this.io.to('admin:room').emit(event, data);
  }

  public broadcastToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public getConnectedUsers() {
    const users: any[] = [];
    this.io.sockets.sockets.forEach((socket: AuthenticatedSocket) => {
      if (socket.isAuthenticated) {
        users.push({
          socketId: socket.id,
          userId: socket.userId,
          email: socket.userEmail,
          role: socket.userRole
        });
      }
    });
    return users;
  }

  public getAdminUsers() {
    const admins: any[] = [];
    this.io.sockets.sockets.forEach((socket: AuthenticatedSocket) => {
      if (socket.isAuthenticated && socket.userRole === 'admin') {
        admins.push({
          socketId: socket.id,
          userId: socket.userId,
          email: socket.userEmail
        });
      }
    });
    return admins;
  }

  // Booking tracking methods
  public broadcastTrackingUpdate(bookingId: string, trackingData: any) {
    this.io.to(`tracking:${bookingId}`).emit('tracking:updated', {
      ...trackingData,
      timestamp: new Date().toISOString()
    });
  }

  public joinTrackingRoom(socketId: string, bookingId: string) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(`tracking:${bookingId}`);
    }
  }

  // Chat methods
  public broadcastChatMessage(conversationId: string, messageData: any) {
    this.io.to(`chat:${conversationId}`).emit('chat:message', {
      ...messageData,
      timestamp: new Date().toISOString()
    });
  }

  public joinChatRoom(socketId: string, conversationId: string) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socketId) {
      socket?.join(`chat:${conversationId}`);
    }
  }

  // Mover location methods
  public broadcastMoverLocation(moverId: string, locationData: any) {
    this.io.to('admin:room').emit('mover:location:updated', {
      moverId,
      ...locationData,
      timestamp: new Date().toISOString()
    });
  }

  // Notification methods
  public sendNotification(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastNotificationToAdmins(notification: any) {
    this.io.to('admin:room').emit('admin:notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }
}

export default SocketUtils; 