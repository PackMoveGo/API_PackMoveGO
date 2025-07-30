import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
  userRole: string;
}

export interface SocketMessage {
  room: string;
  message: string;
  type?: string;
}

export interface TypingData {
  room: string;
  isTyping: boolean;
}

export interface UserTypingEvent {
  userId: string;
  email: string;
  isTyping: boolean;
}

export interface MessageData {
  userId: string;
  email: string;
  message: string;
  type: string;
  timestamp: string;
} 