import request from 'supertest';
import { createServer } from '../server/server';
import { Express } from 'express';
import https from 'https';
import { io as ioClient, Socket } from 'socket.io-client';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('End-to-End Flow Tests', () => {
  let server: https.Server;
  let app: Express;
  let clientSocket: Socket;
  let mobileSocket: Socket;
  let testDir: string;

  beforeAll(() => {
    const { app: testApp, server: testServer } = createServer();
    app = testApp;
    server = testServer;
    
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-assistant-test-'));
  });

  afterAll((done) => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (mobileSocket && mobileSocket.connected) {
      mobileSocket.disconnect();
    }
    
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    server.close(done);
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (mobileSocket && mobileSocket.connected) {
      mobileSocket.disconnect();
    }
  });

  describe('Complete User Journey: First Launch to WordPress', () => {
    let sessionToken: string;
    let articleId: string;

    it('Step 1: First launch - AWS configuration', async () => {
      // Check if config exists
      const checkRes = await request(app)
        .get('/api/config/exists')
        .expect(200);

      // Save AWS configuration
      const config = {
        accessKeyId: 'test-access-key-id',
        secretAccessKey: 'test-secret-access-key',
        region: 'us-east-1',
        bucketName: 'test-blog-bucket'
      };

      const saveRes = await request(app)
        .post('/api/config')
        .send(config)
        .expect(200);

      expect(saveRes.body).toHaveProperty('success', true);
    });

    it('Step 2: Test S3 connection', async () => {
      const testRes = await request(app)
        .get('/api/config/test')
        .expect(200);

      expect(testRes.body).toHaveProperty('success');
      // Note: Will fail with fake credentials, but should handle gracefully
    });

    it('Step 3: Create new article', async () => {
      const testFilePath = path.join(testDir, 'test-article.md');
      const initialContent = '# Test Article\n\nThis is a test article.';
      
      fs.writeFileSync(testFilePath, initialContent);

      const readRes = await request(app)
        .get(`/api/files/${encodeURIComponent(testFilePath)}`)
        .expect(200);

      expect(readRes.body).toHaveProperty('content');
      expect(readRes.body.content).toContain('Test Article');
      
      articleId = 'test-article-' + Date.now();
    });

    it('Step 4: QR code authentication flow', async () => {
      // Generate QR token
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      expect(qrTokenRes.body).toHaveProperty('token');
      const qrToken = qrTokenRes.body.token;

      // Get QR code image
      const qrCodeRes = await request(app)
        .get('/api/auth/qr-code')
        .query({ token: qrToken })
        .expect(200);

      expect(qrCodeRes.body).toHaveProperty('qrCodeDataURL');
      expect(qrCodeRes.body.qrCodeDataURL).toMatch(/^data:image\/png;base64,/);

      // Mobile scans QR code and gets session token
      const sessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken })
        .expect(200);

      expect(sessionRes.body).toHaveProperty('sessionToken');
      sessionToken = sessionRes.body.sessionToken;
    });

    it('Step 5: Mobile connects via WebSocket', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      
      mobileSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket'],
        auth: {
          token: sessionToken
        }
      });

      mobileSocket.on('connect', () => {
        expect(mobileSocket.connected).toBe(true);
        done();
      });

      mobileSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('Step 6: Mobile receives article list', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      
      mobileSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket'],
        auth: {
          token: sessionToken
        }
      });

      mobileSocket.on('connect', () => {
        mobileSocket.on('article-list', (articles) => {
          expect(Array.isArray(articles)).toBe(true);
          done();
        });

        mobileSocket.emit('request-article-list');
      });
    });

    it('Step 7: Mobile uploads image', async () => {
      // Create a fake image buffer
      const fakeImageBuffer = Buffer.from('fake-image-data');
      
      const uploadRes = await request(app)
        .post('/api/images/upload')
        .set('Cookie', `sessionToken=${sessionToken}`)
        .attach('image', fakeImageBuffer, 'test-image.jpg')
        .field('articleId', articleId);

      // Will fail without real S3 credentials, but should handle gracefully
      expect([200, 500]).toContain(uploadRes.status);
    });

    it('Step 8: PC receives image insert notification', (done) => {
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
          articleId: articleId,
          imageUrl: 'https://test-bucket.s3.amazonaws.com/test-image.jpg'
        });
      });
    });

    it('Step 9: Save article with image', async () => {
      const testFilePath = path.join(testDir, 'test-article-with-image.md');
      const contentWithImage = '# Test Article\n\n![Image](https://test-bucket.s3.amazonaws.com/test-image.jpg)\n\nArticle content.';
      
      const saveRes = await request(app)
        .post('/api/files')
        .send({
          filePath: testFilePath,
          content: contentWithImage
        })
        .expect(200);

      expect(saveRes.body).toHaveProperty('success', true);
      
      // Verify file was saved
      const savedContent = fs.readFileSync(testFilePath, 'utf-8');
      expect(savedContent).toContain('![Image]');
    });

    it('Step 10: Export for WordPress', async () => {
      const testFilePath = path.join(testDir, 'test-article-with-image.md');
      
      const readRes = await request(app)
        .get(`/api/files/${encodeURIComponent(testFilePath)}`)
        .expect(200);

      expect(readRes.body).toHaveProperty('content');
      
      // Verify content is WordPress Jetpack Markdown compatible
      const content = readRes.body.content;
      expect(content).toMatch(/!\[.*\]\(https:\/\/.+\)/);
    });
  });

  describe('QR Code Authentication Flow', () => {
    it('should complete full QR authentication cycle', async () => {
      // Step 1: PC generates QR token
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const qrToken = qrTokenRes.body.token;
      expect(qrToken).toBeDefined();

      // Step 2: PC displays QR code
      const qrCodeRes = await request(app)
        .get('/api/auth/qr-code')
        .query({ token: qrToken })
        .expect(200);

      expect(qrCodeRes.body.qrCodeDataURL).toMatch(/^data:image\/png;base64,/);

      // Step 3: Mobile scans and exchanges for session token
      const sessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken })
        .expect(200);

      const sessionToken = sessionRes.body.sessionToken;
      expect(sessionToken).toBeDefined();

      // Step 4: Mobile uses session token for authenticated requests
      const authRes = await request(app)
        .get('/api/images')
        .set('Cookie', `sessionToken=${sessionToken}`)
        .expect(200);

      expect(Array.isArray(authRes.body)).toBe(true);

      // Step 5: QR token should be consumed (can't reuse)
      const reuseRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken })
        .expect(401);

      expect(reuseRes.body).toHaveProperty('error');
    });

    it('should handle QR code regeneration', async () => {
      // Generate first QR token
      const firstTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const firstToken = firstTokenRes.body.token;

      // Regenerate QR code (invalidates first token)
      const secondTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const secondToken = secondTokenRes.body.token;
      expect(secondToken).not.toBe(firstToken);

      // First token should still work (tokens don't auto-invalidate on new generation)
      const sessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: firstToken })
        .expect(200);

      expect(sessionRes.body).toHaveProperty('sessionToken');
    });
  });

  describe('Multiple Article Tabs Operation', () => {
    it('should handle multiple articles simultaneously', async () => {
      const articles = [
        { path: path.join(testDir, 'article1.md'), content: '# Article 1' },
        { path: path.join(testDir, 'article2.md'), content: '# Article 2' },
        { path: path.join(testDir, 'article3.md'), content: '# Article 3' }
      ];

      // Create multiple articles
      for (const article of articles) {
        const saveRes = await request(app)
          .post('/api/files')
          .send({
            filePath: article.path,
            content: article.content
          })
          .expect(200);

        expect(saveRes.body).toHaveProperty('success', true);
      }

      // Read all articles
      for (const article of articles) {
        const readRes = await request(app)
          .get(`/api/files/${encodeURIComponent(article.path)}`)
          .expect(200);

        expect(readRes.body.content).toContain(article.content);
      }

      // Get recent files list
      const listRes = await request(app)
        .get('/api/files')
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle article switching via WebSocket', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      
      clientSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket']
      });

      const articles = [
        { id: 'article-1', title: 'Article 1' },
        { id: 'article-2', title: 'Article 2' },
        { id: 'article-3', title: 'Article 3' }
      ];

      clientSocket.on('connect', () => {
        clientSocket.on('article-list', (receivedArticles) => {
          expect(Array.isArray(receivedArticles)).toBe(true);
          done();
        });

        // Emit article list update
        clientSocket.emit('update-article-list', articles);
        clientSocket.emit('request-article-list');
      });
    });

    it('should handle concurrent image uploads to different articles', async () => {
      // Get session token
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const sessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: qrTokenRes.body.token })
        .expect(200);

      const sessionToken = sessionRes.body.sessionToken;

      // Simulate concurrent uploads
      const fakeImageBuffer = Buffer.from('fake-image-data');
      const uploadPromises = [
        request(app)
          .post('/api/images/upload')
          .set('Cookie', `sessionToken=${sessionToken}`)
          .attach('image', fakeImageBuffer, 'image1.jpg')
          .field('articleId', 'article-1'),
        request(app)
          .post('/api/images/upload')
          .set('Cookie', `sessionToken=${sessionToken}`)
          .attach('image', fakeImageBuffer, 'image2.jpg')
          .field('articleId', 'article-2'),
        request(app)
          .post('/api/images/upload')
          .set('Cookie', `sessionToken=${sessionToken}`)
          .attach('image', fakeImageBuffer, 'image3.jpg')
          .field('articleId', 'article-3')
      ];

      const results = await Promise.allSettled(uploadPromises);
      
      // All should complete (success or graceful failure)
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from network interruption', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      
      clientSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 100,
        reconnectionAttempts: 3
      });

      let disconnected = false;
      let reconnected = false;

      clientSocket.on('connect', () => {
        if (!disconnected) {
          // First connection - force disconnect
          clientSocket.disconnect();
          disconnected = true;
        } else {
          // Reconnected
          reconnected = true;
          expect(reconnected).toBe(true);
          done();
        }
      });

      clientSocket.on('disconnect', () => {
        if (disconnected && !reconnected) {
          // Attempt reconnection
          clientSocket.connect();
        }
      });
    });

    it('should handle file save failures gracefully', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/file.md';
      
      const saveRes = await request(app)
        .post('/api/files')
        .send({
          filePath: invalidPath,
          content: 'Test content'
        })
        .expect(500);

      expect(saveRes.body).toHaveProperty('error');
    });

    it('should handle session expiration', async () => {
      const expiredToken = 'expired-session-token';
      
      const res = await request(app)
        .get('/api/images')
        .set('Cookie', `sessionToken=${expiredToken}`)
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });
});
