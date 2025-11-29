import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketService } from '../services/WebSocketService';
import { AuthService } from '../services/AuthService';

describe('WebSocketService', () => {
  let httpServer: HTTPServer;
  let ioServer: SocketIOServer;
  let authService: AuthService;
  let clientSocket: ClientSocket;
  const port = 3002;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = require('http').createServer();
    
    // Create Socket.IO server
    ioServer = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        credentials: true,
      },
    });

    // Create services
    authService = new AuthService();
    new WebSocketService(ioServer, authService);

    httpServer.listen(port, () => {
      done();
    });
  });

  afterAll((done) => {
    ioServer.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    // Generate valid session token
    const qrToken = authService.generateQRToken();
    const session = authService.validateQRTokenAndIssueSession(qrToken.token);

    // Create client socket with valid token
    clientSocket = ioClient(`http://localhost:${port}`, {
      auth: {
        token: session!.sessionToken,
      },
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection', () => {
    it('should accept connection with valid token', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should reject connection with invalid token', (done) => {
      const invalidClient = ioClient(`http://localhost:${port}`, {
        auth: {
          token: 'invalid-token',
        },
      });

      invalidClient.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        invalidClient.disconnect();
        done();
      });
    });

    it('should reject connection without token', (done) => {
      const noTokenClient = ioClient(`http://localhost:${port}`);

      noTokenClient.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        noTokenClient.disconnect();
        done();
      });
    });
  });

  describe('Disconnect', () => {
    it('should handle client disconnect', (done) => {
      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });

      clientSocket.disconnect();
    });
  });

  describe('Heartbeat', () => {
    it('should respond to ping with pong', (done) => {
      clientSocket.emit('ping');

      clientSocket.on('pong', () => {
        done();
      });
    });
  });

  describe('Image Insert Event', () => {
    it('should receive image insert event', (done) => {
      const testData = {
        articleId: 'test-article-123',
        imageUrl: 'https://example.com/image.png',
      };

      clientSocket.on('image:insert', (data) => {
        expect(data.articleId).toBe(testData.articleId);
        expect(data.imageUrl).toBe(testData.imageUrl);
        done();
      });

      // Emit from server
      ioServer.emit('image:insert', testData);
    });
  });

  describe('Article List Event', () => {
    it('should receive article list event', (done) => {
      const testData = {
        articles: [
          { id: 'article-1', title: 'Test Article 1' },
          { id: 'article-2', title: 'Test Article 2' },
        ],
      };

      clientSocket.on('article:list', (data) => {
        expect(data.articles).toHaveLength(2);
        expect(data.articles[0].id).toBe('article-1');
        expect(data.articles[1].title).toBe('Test Article 2');
        done();
      });

      // Emit from server
      ioServer.emit('article:list', testData);
    });
  });

  describe('Article Update Event', () => {
    it('should receive article update event', (done) => {
      const testData = {
        articleId: 'article-123',
        title: 'Updated Title',
      };

      clientSocket.on('article:update', (data) => {
        expect(data.articleId).toBe(testData.articleId);
        expect(data.title).toBe(testData.title);
        done();
      });

      // Emit from server
      ioServer.emit('article:update', testData);
    });
  });
});
