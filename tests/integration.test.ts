import request from 'supertest';
import { createServer } from '../server/server';
import { Express } from 'express';
import https from 'https';
import { io as ioClient, Socket } from 'socket.io-client';
import { AuthService } from '../server/services/AuthService';
import { ConfigService } from '../server/services/ConfigService';
import { S3Service } from '../server/services/S3Service';

describe('Integration Tests - Frontend & Backend', () => {
  let server: https.Server;
  let app: Express;
  let authService: AuthService;
  let clientSocket: Socket;

  beforeAll(() => {
    const { app: testApp, server: testServer } = createServer();
    app = testApp;
    server = testServer;
    authService = new AuthService();
  });

  afterAll((done) => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    server.close(done);
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('API Integration', () => {
    describe('Authentication Flow', () => {
      it('should generate QR token via API', async () => {
        const response = await request(app)
          .post('/api/auth/qr-token')
          .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('expiresAt');
        expect(response.body.token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      it('should generate QR code image via API', async () => {
        const tokenResponse = await request(app)
          .post('/api/auth/qr-token')
          .expect(200);

        const qrResponse = await request(app)
          .get('/api/auth/qr-code')
          .query({ token: tokenResponse.body.token })
          .expect(200);

        expect(qrResponse.body).toHaveProperty('qrCodeDataURL');
        expect(qrResponse.body.qrCodeDataURL).toMatch(/^data:image\/png;base64,/);
      });

      it('should exchange QR token for session token', async () => {
        const tokenResponse = await request(app)
          .post('/api/auth/qr-token')
          .expect(200);

        const sessionResponse = await request(app)
          .post('/api/auth/session')
          .send({ qrToken: tokenResponse.body.token })
          .expect(200);

        expect(sessionResponse.body).toHaveProperty('sessionToken');
        expect(sessionResponse.body).toHaveProperty('expiresAt');
      });

      it('should reject invalid QR token', async () => {
        const response = await request(app)
          .post('/api/auth/session')
          .send({ qrToken: 'invalid-token' })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      it('should reject expired QR token', async () => {
        const token = authService.generateQRToken();
        // Manually expire the token
        authService['tokens'].get(token.token)!.expiresAt = new Date(Date.now() - 1000);

        const response = await request(app)
          .post('/api/auth/session')
          .send({ qrToken: token.token })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Configuration Management', () => {
      it('should save AWS configuration', async () => {
        const config = {
          accessKeyId: 'test-key-id',
          secretAccessKey: 'test-secret-key',
          region: 'us-east-1',
          bucketName: 'test-bucket'
        };

        const response = await request(app)
          .post('/api/config')
          .send(config)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should validate AWS configuration format', async () => {
        const invalidConfig = {
          accessKeyId: 'test-key-id',
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/config')
          .send(invalidConfig)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('File Operations', () => {
      it('should list recent files', async () => {
        const response = await request(app)
          .get('/api/files')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should handle file read errors gracefully', async () => {
        const response = await request(app)
          .get('/api/files/nonexistent-file.md')
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Image Management', () => {
      it('should require authentication for image upload', async () => {
        const response = await request(app)
          .post('/api/images/upload')
          .attach('image', Buffer.from('fake-image'), 'test.jpg')
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      it('should list images', async () => {
        const response = await request(app)
          .get('/api/images')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('WebSocket Communication', () => {
    it('should establish WebSocket connection', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      clientSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should handle authentication for WebSocket', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      
      // First get a session token
      request(app)
        .post('/api/auth/qr-token')
        .then((tokenRes) => {
          return request(app)
            .post('/api/auth/session')
            .send({ qrToken: tokenRes.body.token });
        })
        .then((sessionRes) => {
          clientSocket = ioClient(socketUrl, {
            rejectUnauthorized: false,
            transports: ['websocket'],
            auth: {
              token: sessionRes.body.sessionToken
            }
          });

          clientSocket.on('connect', () => {
            expect(clientSocket.connected).toBe(true);
            done();
          });

          clientSocket.on('connect_error', (error) => {
            done(error);
          });
        });
    });

    it('should receive article list via WebSocket', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      clientSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.on('article-list', (data) => {
          expect(Array.isArray(data)).toBe(true);
          done();
        });

        // Trigger article list request
        clientSocket.emit('request-article-list');
      });
    });

    it('should handle image insert event', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      clientSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.on('image-inserted', (data) => {
          expect(data).toHaveProperty('articleId');
          expect(data).toHaveProperty('imageUrl');
          done();
        });

        // Simulate image insert from mobile
        clientSocket.emit('insert-image', {
          articleId: 'test-article-id',
          imageUrl: 'https://example.com/image.jpg'
        });
      });
    });

    it('should handle WebSocket disconnection gracefully', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      clientSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.disconnect();
      });

      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/config')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle rate limiting', async () => {
      const tokenRequests = Array(10).fill(null).map(() =>
        request(app).post('/api/auth/qr-token')
      );

      const responses = await Promise.all(tokenRequests);
      const tooManyRequests = responses.filter(r => r.status === 429);
      
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });

    it('should handle CORS errors', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle missing authentication', async () => {
      const response = await request(app)
        .post('/api/images/upload')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should complete full authentication flow', async () => {
      // Step 1: Generate QR token
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      expect(qrTokenRes.body).toHaveProperty('token');

      // Step 2: Get QR code image
      const qrCodeRes = await request(app)
        .get('/api/auth/qr-code')
        .query({ token: qrTokenRes.body.token })
        .expect(200);

      expect(qrCodeRes.body).toHaveProperty('qrCodeDataURL');

      // Step 3: Exchange for session token
      const sessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: qrTokenRes.body.token })
        .expect(200);

      expect(sessionRes.body).toHaveProperty('sessionToken');

      // Step 4: Use session token for authenticated request
      const authenticatedRes = await request(app)
        .get('/api/images')
        .set('Cookie', `sessionToken=${sessionRes.body.sessionToken}`)
        .expect(200);

      expect(Array.isArray(authenticatedRes.body)).toBe(true);
    });

    it('should handle configuration and S3 connection test flow', async () => {
      // Step 1: Save configuration
      const config = {
        accessKeyId: 'test-key-id',
        secretAccessKey: 'test-secret-key',
        region: 'us-east-1',
        bucketName: 'test-bucket'
      };

      const saveRes = await request(app)
        .post('/api/config')
        .send(config)
        .expect(200);

      expect(saveRes.body).toHaveProperty('success', true);

      // Step 2: Test S3 connection (will fail with fake credentials, but should handle gracefully)
      const testRes = await request(app)
        .get('/api/config/test')
        .expect(200);

      expect(testRes.body).toHaveProperty('success');
    });
  });
});
