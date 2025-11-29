import { WebSocketService } from '../services/WebSocketService';
import { AuthService } from '../services/AuthService';

describe('WebSocketService', () => {
  let io: any;
  let authService: AuthService;
  let webSocketService: WebSocketService;
  let mockSocket: any;

  beforeEach(() => {
    // Mock Socket.IO server
    mockSocket = {
      id: 'test-socket-id',
      data: { authenticated: false },
      handshake: {
        auth: {},
      },
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    io = {
      use: jest.fn((middleware) => {
        // Call middleware with mock socket
        const next = jest.fn();
        middleware(mockSocket, next);
      }),
      on: jest.fn((event, handler) => {
        if (event === 'connection') {
          handler(mockSocket);
        }
      }),
      emit: jest.fn(),
      engine: {
        on: jest.fn(),
      },
    };
    
    // Create AuthService
    authService = new AuthService();
    
    // Create WebSocketService
    webSocketService = new WebSocketService(io, authService);
  });

  afterEach(() => {
    authService.destroy();
  });

  describe('エラーハンドリング', () => {
    it('EPIPEエラーを無視する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Get the error handler
      const errorHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];
      expect(errorHandler).toBeDefined();
      
      // Simulate EPIPE error
      const epipeError = new Error('write EPIPE') as any;
      epipeError.code = 'EPIPE';
      errorHandler(epipeError);
      
      // EPIPE errors should not be logged
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('errno -32 エラーを無視する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const errorHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];
      
      // Simulate errno -32 error
      const errnoError = new Error('write error') as any;
      errnoError.errno = -32;
      errorHandler(errnoError);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('ECONNRESETエラーを無視する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const connErrorHandler = io.engine.on.mock.calls.find((call: any) => call[0] === 'connection_error')?.[1];
      expect(connErrorHandler).toBeDefined();
      
      // Simulate connection error
      const connError = new Error('Connection reset') as any;
      connError.code = 'ECONNRESET';
      connErrorHandler(connError);
      
      // ECONNRESET errors should not be logged
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('その他のエラーはログに記録される', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const errorHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];
      
      // Simulate other error
      const otherError = new Error('Some other error') as any;
      otherError.code = 'EOTHER';
      errorHandler(otherError);
      
      // Other errors should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebSocket] Socket error:'),
        'test-socket-id',
        'Some other error'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('接続管理', () => {
    it('クライアント接続時にログが出力される', () => {
      // Create a new mock socket and service to test connection logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const newMockSocket = {
        id: 'new-socket-id',
        data: { authenticated: false },
        handshake: { auth: {} },
        on: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      const newIo = {
        use: jest.fn((middleware) => {
          const next = jest.fn();
          middleware(newMockSocket, next);
        }),
        on: jest.fn((event, handler) => {
          if (event === 'connection') {
            handler(newMockSocket);
          }
        }),
        emit: jest.fn(),
        engine: { on: jest.fn() },
      };

      new WebSocketService(newIo as any, authService);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebSocket] Client connected:'),
        'new-socket-id',
        'authenticated:',
        false
      );
      consoleSpy.mockRestore();
    });

    it('クライアント切断時にログが出力される', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const disconnectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'disconnect')?.[1];
      expect(disconnectHandler).toBeDefined();
      
      disconnectHandler('client namespace disconnect');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebSocket] Client disconnected:'),
        'test-socket-id',
        'reason:',
        'client namespace disconnect'
      );
      consoleSpy.mockRestore();
    });

    it('ping/pongハートビートが動作する', () => {
      const pingHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'ping')?.[1];
      expect(pingHandler).toBeDefined();
      
      pingHandler();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('pong');
    });
  });

  describe('イベント送信', () => {
    it('画像挿入イベントを送信できる', () => {
      webSocketService.emitImageInsert('test-article', 'https://example.com/image.jpg');
      
      expect(io.emit).toHaveBeenCalledWith('image-insert', {
        articleId: 'test-article',
        imageUrl: 'https://example.com/image.jpg',
      });
    });

    it('記事リストイベントを送信できる', () => {
      const articles = [
        { id: '1', title: 'Article 1' },
        { id: '2', title: 'Article 2' },
      ];

      webSocketService.emitArticleList(articles);
      
      expect(io.emit).toHaveBeenCalledWith('article-list', { articles });
    });

    it('記事更新イベントを送信できる', () => {
      webSocketService.emitArticleUpdate('test-article', 'Updated Title');
      
      expect(io.emit).toHaveBeenCalledWith('article-update', {
        articleId: 'test-article',
        title: 'Updated Title',
      });
    });
  });
});
