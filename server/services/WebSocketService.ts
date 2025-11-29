import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthService } from './AuthService';

/**
 * WebSocketService - Real-time communication between PC and mobile
 */
export class WebSocketService {
  private io: SocketIOServer;
  private authService: AuthService;

  constructor(io: SocketIOServer, authService: AuthService) {
    this.io = io;
    this.authService = authService;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      // Allow connections without token (for PC editor)
      // Mobile clients must provide a valid session token
      if (!token) {
        socket.data.authenticated = false;
        return next();
      }

      const isValid = this.authService.validateSessionToken(token);

      if (!isValid) {
        return next(new Error('Authentication failed: Invalid or expired token'));
      }

      // Store token in socket data
      socket.data.token = token;
      socket.data.authenticated = true;
      next();
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('[WebSocket] Client connected:', socket.id, 'authenticated:', socket.data.authenticated);

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Client disconnected:', socket.id, 'reason:', reason);
      });

      // Handle ping/pong for heartbeat
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  /**
   * Emit image insert event to PC editor
   */
  emitImageInsert(articleId: string, imageUrl: string): void {
    this.io.emit('image-insert', { articleId, imageUrl });
  }

  /**
   * Emit article list to mobile
   */
  emitArticleList(articles: Array<{ id: string; title: string }>): void {
    this.io.emit('article-list', { articles });
  }

  /**
   * Emit article update notification
   */
  emitArticleUpdate(articleId: string, title: string): void {
    this.io.emit('article-update', { articleId, title });
  }
}

