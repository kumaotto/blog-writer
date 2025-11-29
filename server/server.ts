import express, { Express, Request, Response, NextFunction } from 'express';
import https from 'https';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import { generateSelfSignedCertificate } from './utils/generateCertificate';
import { AuthService } from './services/AuthService';
import { ConfigService } from './services/ConfigService';
import { S3Service } from './services/S3Service';
import { FileService } from './services/FileService';
import { WebSocketService } from './services/WebSocketService';
import { ErrorHandler, ErrorMessageFormatter } from './utils/ErrorHandler';
import { RateLimiter } from './middleware/RateLimiter';

export interface ServerConfig {
  port?: number;
}

/**
 * Create Express server with HTTPS and CORS configuration
 */
export function createServer(config: ServerConfig = {}) {
  const app: Express = express();
  const port = config.port || 3001;

  // Initialize services
  const authService = new AuthService();
  const configService = new ConfigService();
  const s3Service = new S3Service();
  const fileService = new FileService();

  // Initialize rate limiters
  const imageUploadLimiter = new RateLimiter(10, 60 * 1000); // 10 requests per minute
  const qrCodeLimiter = new RateLimiter(5, 60 * 1000); // 5 requests per minute

  // In-memory article list storage (shared between PC and mobile)
  let articleList: Array<{ id: string; title: string }> = [];

  // Middleware - increase body size limit for image uploads (10MB)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // CORS configuration - allow localhost and ngrok
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is localhost with any port
        const localhostPattern = /^https?:\/\/localhost(:\d+)?$/;
        const localhostIPPattern = /^https?:\/\/127\.0\.0\.1(:\d+)?$/;
        const localNetworkPattern = /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/;
        // Allow ngrok URLs
        const ngrokPattern = /^https?:\/\/[a-z0-9]+\.ngrok(-free)?\.app$/;
        const ngrokIOPattern = /^https?:\/\/[a-z0-9]+\.ngrok\.io$/;

        if (
          localhostPattern.test(origin) ||
          localhostIPPattern.test(origin) ||
          localNetworkPattern.test(origin) ||
          ngrokPattern.test(origin) ||
          ngrokIOPattern.test(origin)
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ===== Authentication Endpoints =====

  /**
   * POST /api/auth/qr-token - Generate QR token
   */
  app.post('/api/auth/qr-token', qrCodeLimiter.middleware(), (_req: Request, res: Response) => {
    try {
      const { token, expiresAt } = authService.generateQRToken();
      res.json({ token, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      console.error('Error generating QR token:', error);
      res.status(500).json({ error: 'Failed to generate QR token' });
    }
  });

  /**
   * POST /api/auth/session - Issue session token from QR token
   */
  app.post('/api/auth/session', (req: Request, res: Response) => {
    try {
      const { qrToken } = req.body;

      console.log('[AUTH] Session request received');
      console.log('[AUTH] QR Token from request:', qrToken);
      console.log('[AUTH] Available tokens:', authService.getTokenStats());

      if (!qrToken) {
        console.log('[AUTH] ERROR: No QR token provided');
        return res.status(400).json({ error: 'QR token is required' });
      }

      const result = authService.validateQRTokenAndIssueSession(qrToken);

      if (!result) {
        console.log('[AUTH] ERROR: Token validation failed for:', qrToken);
        return res.status(401).json({ 
          error: 'Invalid or expired QR token. Please scan a new QR code from your PC.' 
        });
      }

      console.log('[AUTH] SUCCESS: Session token issued:', result.sessionToken);

      // Set session token in cookie
      res.cookie('sessionToken', result.sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        expires: result.expiresAt,
      });

      res.json({
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (error) {
      console.error('Error issuing session token:', error);
      res.status(500).json({ error: 'Failed to issue session token' });
    }
  });

  /**
   * GET /api/auth/qr-code - Get QR code image
   */
  app.get('/api/auth/qr-code', qrCodeLimiter.middleware(), async (_req: Request, res: Response) => {
    try {
      const { token, qrCodeDataURL } = await authService.regenerateQRCodeAsync();
      const baseUrl = process.env.PUBLIC_URL || 'https://localhost:3001';
      console.log('[AUTH] QR Code generated with token:', token);
      console.log('[AUTH] QR Code URL:', `${baseUrl}/mobile?token=${token}`);
      console.log('[AUTH] PUBLIC_URL:', process.env.PUBLIC_URL || 'not set');
      res.json({ token, qrCodeDataURL });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  // ===== Configuration Endpoints =====

  /**
   * POST /api/config - Save AWS credentials
   */
  app.post('/api/config', async (req: Request, res: Response) => {
    try {
      const { accessKeyId, secretAccessKey, region, bucketName } = req.body;

      console.log('📥 Received config save request');
      console.log('   Has accessKeyId:', !!accessKeyId);
      console.log('   Has secretAccessKey:', !!secretAccessKey);
      console.log('   Region:', region);
      console.log('   Bucket:', bucketName);

      if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ error: 'All AWS credentials are required' });
      }

      const credentials = { accessKeyId, secretAccessKey, region, bucketName };

      await configService.saveConfig(credentials);
      console.log('✅ Configuration saved successfully');
      res.json({ success: true, message: 'Configuration saved successfully' });
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('   Error message:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        error: 'Failed to save configuration',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * GET /api/config/exists - Check if configuration exists
   */
  app.get('/api/config/exists', async (_req: Request, res: Response) => {
    try {
      const exists = await configService.configExists();
      res.json({ exists });
    } catch (error) {
      console.error('Error checking configuration existence:', error);
      res.status(500).json({ error: 'Failed to check configuration' });
    }
  });

  /**
   * GET /api/config/test - Test S3 connection
   */
  app.get('/api/config/test', async (_req: Request, res: Response) => {
    try {
      const credentials = await configService.loadConfig();

      if (!credentials) {
        return res.status(400).json({ error: 'No configuration found' });
      }

      const isConnected = await s3Service.initialize(credentials);

      if (!isConnected) {
        return res.status(500).json({ error: 'Failed to connect to S3' });
      }

      const testResult = await s3Service.testConnection();

      if (testResult) {
        res.json({ success: true, message: 'S3 connection successful' });
      } else {
        res.status(500).json({ error: 'S3 connection test failed' });
      }
    } catch (error) {
      console.error('Error testing S3 connection:', error);
      res.status(500).json({ error: 'Failed to test S3 connection' });
    }
  });

  /**
   * DELETE /api/config - Delete all configuration data
   */
  app.delete('/api/config', async (_req: Request, res: Response) => {
    try {
      await configService.deleteAllData();
      res.json({ success: true, message: 'All data deleted successfully' });
    } catch (error) {
      console.error('Error deleting configuration:', error);
      res.status(500).json({ error: 'Failed to delete configuration' });
    }
  });

  // ===== Image Management Endpoints =====

  /**
   * POST /api/images/upload - Upload image to S3
   */
  app.post('/api/images/upload', imageUploadLimiter.middleware(), async (req: Request, res: Response) => {
    try {
      // Validate session token
      const sessionToken = req.cookies?.sessionToken || req.headers.authorization?.replace('Bearer ', '');

      if (!sessionToken || !authService.validateSessionToken(sessionToken)) {
        return res.status(401).json({ error: 'Invalid or expired session token' });
      }

      const { file, mimeType } = req.body;

      if (!file || !mimeType) {
        return res.status(400).json({ error: 'File and mimeType are required' });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(file, 'base64');

      const result = await s3Service.uploadImage(buffer, mimeType);
      res.json(result);
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  /**
   * GET /api/images - List all images
   */
  app.get('/api/images', async (_req: Request, res: Response) => {
    try {
      const images = await s3Service.listImages();
      res.json({ images });
    } catch (error) {
      console.error('Error listing images:', error);
      res.status(500).json({ error: 'Failed to list images' });
    }
  });

  /**
   * DELETE /api/images/:key - Delete image from S3
   */
  app.delete('/api/images/:key', async (req: Request, res: Response) => {
    try {
      const { key } = req.params;

      if (!key) {
        return res.status(400).json({ error: 'Image key is required' });
      }

      await s3Service.deleteImage(key);
      res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  });

  // ===== Article Management Endpoints =====

  /**
   * GET /api/articles - Get article list (for mobile)
   */
  app.get('/api/articles', (req: Request, res: Response) => {
    try {
      console.log('[ARTICLES] Request received');
      // Validate session token
      const sessionToken = req.cookies?.sessionToken || req.headers.authorization?.replace('Bearer ', '');
      console.log('[ARTICLES] Session token:', sessionToken ? 'present' : 'missing');

      if (!sessionToken || !authService.validateSessionToken(sessionToken)) {
        console.log('[ARTICLES] ERROR: Invalid session token');
        return res.status(401).json({ error: 'Invalid or expired session token' });
      }

      console.log('[ARTICLES] Sending article list:', articleList);
      res.json({ articles: articleList });
    } catch (error) {
      console.error('Error getting article list:', error);
      res.status(500).json({ error: 'Failed to get article list' });
    }
  });

  /**
   * POST /api/articles - Update article list (from PC)
   */
  app.post('/api/articles', (req: Request, res: Response) => {
    try {
      const { articles } = req.body;

      if (!Array.isArray(articles)) {
        return res.status(400).json({ error: 'Articles must be an array' });
      }

      articleList = articles;
      res.json({ success: true, message: 'Article list updated' });
    } catch (error) {
      console.error('Error updating article list:', error);
      res.status(500).json({ error: 'Failed to update article list' });
    }
  });

  // ===== File Management Endpoints =====

  /**
   * GET /api/files - List recent files
   */
  app.get('/api/files', async (_req: Request, res: Response) => {
    try {
      const files = await fileService.listRecentFiles();
      res.json({ files });
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ error: 'Failed to list files' });
    }
  });

  /**
   * GET /api/files/:path - Read file content
   */
  app.get('/api/files/:path', async (req: Request, res: Response) => {
    try {
      const { path } = req.params;

      if (!path) {
        return res.status(400).json({ error: 'File path is required' });
      }

      const content = await fileService.readFile(path);
      res.json({ content });
    } catch (error) {
      console.error('Error reading file:', error);
      res.status(500).json({ error: 'Failed to read file' });
    }
  });

  /**
   * POST /api/files - Save file
   */
  app.post('/api/files', async (req: Request, res: Response) => {
    try {
      const { path, filePath, content } = req.body;
      const targetPath = filePath || path; // Support both 'filePath' and 'path' for backwards compatibility

      if (!targetPath || content === undefined) {
        return res.status(400).json({ error: 'Path and content are required' });
      }

      await fileService.saveFile(targetPath, content);
      res.json({ success: true, message: 'File saved successfully' });
    } catch (error) {
      console.error('Error saving file:', error);
      res.status(500).json({ error: 'Failed to save file' });
    }
  });

  // Generate self-signed certificate
  const { key, cert } = generateSelfSignedCertificate();

  // Create HTTPS server
  const server = https.createServer({ key, cert }, app);

  // Setup Socket.IO server
  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is localhost with any port
        const localhostPattern = /^https?:\/\/localhost(:\d+)?$/;
        const localhostIPPattern = /^https?:\/\/127\.0\.0\.1(:\d+)?$/;
        const localNetworkPattern = /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/;

        if (
          localhostPattern.test(origin) ||
          localhostIPPattern.test(origin) ||
          localNetworkPattern.test(origin)
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
  });

  // Initialize WebSocket service
  const webSocketService = new WebSocketService(io, authService);

  // Update image upload endpoint to emit WebSocket event
  app.post('/api/images/upload-mobile', imageUploadLimiter.middleware(), async (req: Request, res: Response) => {
    try {
      // Validate session token
      const sessionToken = req.cookies?.sessionToken || req.headers.authorization?.replace('Bearer ', '');

      if (!sessionToken || !authService.validateSessionToken(sessionToken)) {
        return res.status(401).json({ error: 'Invalid or expired session token' });
      }

      const { file, mimeType, articleId } = req.body;

      if (!file || !mimeType || !articleId) {
        return res.status(400).json({ error: 'File, mimeType, and articleId are required' });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(file, 'base64');

      const result = await s3Service.uploadImage(buffer, mimeType);
      
      // Emit image insert event via WebSocket
      webSocketService.emitImageInsert(articleId, result.url);
      
      res.json(result);
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  // Update article list endpoint to emit WebSocket event
  app.post('/api/articles', (req: Request, res: Response) => {
    try {
      const { articles } = req.body;

      if (!Array.isArray(articles)) {
        return res.status(400).json({ error: 'Articles must be an array' });
      }

      articleList = articles;
      
      // Emit article list update via WebSocket
      webSocketService.emitArticleList(articles);
      
      res.json({ success: true, message: 'Article list updated' });
    } catch (error) {
      console.error('Error updating article list:', error);
      res.status(500).json({ error: 'Failed to update article list' });
    }
  });

  // Global error handling middleware (must be last)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const appError = ErrorHandler.handle(err, `${req.method} ${req.path}`);
    const userMessage = ErrorMessageFormatter.format(appError);

    res.status(appError.statusCode).json({
      error: userMessage,
      type: appError.type,
      retryable: appError.retryable,
    });
  });

  return { app, server, port, authService, configService, s3Service, io };
}
