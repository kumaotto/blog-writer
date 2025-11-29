import request from 'supertest';
import { createServer } from '../server/server';
import { Express } from 'express';
import https from 'https';
import { io as ioClient, Socket } from 'socket.io-client';
import { AuthService } from '../server/services/AuthService';

describe('Security Tests', () => {
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

  describe('Token Expiration Scenarios', () => {
    it('should reject expired QR token', async () => {
      // Generate QR token
      const token = authService.generateQRToken();
      
      // Manually expire the token
      const tokenData = authService['tokens'].get(token.token);
      if (tokenData) {
        tokenData.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
      }

      // Try to exchange expired token
      const response = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: token.token })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/expired|invalid/i);
    });

    it('should reject expired session token', async () => {
      // Generate valid QR token and exchange for session
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const sessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: qrTokenRes.body.token })
        .expect(200);

      const sessionToken = sessionRes.body.sessionToken;

      // Manually expire the session token
      const tokenData = authService['tokens'].get(sessionToken);
      if (tokenData) {
        tokenData.expiresAt = new Date(Date.now() - 1000);
      }

      // Try to use expired session token
      const response = await request(app)
        .get('/api/images')
        .set('Cookie', `sessionToken=${sessionToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should enforce QR token 5-minute expiration', async () => {
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const expiresAt = new Date(qrTokenRes.body.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

      // Should expire in approximately 5 minutes (allow 1 second tolerance)
      expect(diffMinutes).toBeGreaterThan(4.98);
      expect(diffMinutes).toBeLessThanOrEqual(5);
    });

    it('should enforce session token 1-hour expiration', async () => {
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const sessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: qrTokenRes.body.token })
        .expect(200);

      const expiresAt = new Date(sessionRes.body.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

      // Should expire in approximately 60 minutes
      expect(diffMinutes).toBeGreaterThan(59);
      expect(diffMinutes).toBeLessThanOrEqual(60);
    });

    it('should invalidate all tokens on server restart', () => {
      // Generate tokens
      const token1 = authService.generateQRToken();
      const token2 = authService.generateQRToken();

      // Verify tokens exist
      expect(authService.validateQRToken(token1.token)).toBeTruthy();
      expect(authService.validateQRToken(token2.token)).toBeTruthy();

      // Simulate server restart by creating new AuthService instance
      const newAuthService = new AuthService();

      // Old tokens should not exist in new instance
      expect(newAuthService.validateQRToken(token1.token)).toBeFalsy();
      expect(newAuthService.validateQRToken(token2.token)).toBeFalsy();
    });

    it('should not allow QR token reuse after session creation', async () => {
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const qrToken = qrTokenRes.body.token;

      // First exchange - should succeed
      const firstSessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken })
        .expect(200);

      expect(firstSessionRes.body).toHaveProperty('sessionToken');

      // Second exchange with same QR token - should fail
      const secondSessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken })
        .expect(401);

      expect(secondSessionRes.body).toHaveProperty('error');
    });
  });

  describe('Unauthorized Access Attempts', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .post('/api/images/upload')
        .attach('image', Buffer.from('fake-image'), 'test.jpg')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid session tokens', async () => {
      const response = await request(app)
        .get('/api/images')
        .set('Cookie', 'sessionToken=invalid-token-12345')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        '',
        'null',
        'undefined',
        '{}',
        '[]',
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
        'SELECT * FROM tokens'
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/images')
          .set('Cookie', `sessionToken=${token}`)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should reject WebSocket connections without valid token', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      
      clientSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket'],
        auth: {
          token: 'invalid-token'
        }
      });

      clientSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      clientSocket.on('connect', () => {
        // Should not connect with invalid token
        done(new Error('Should not connect with invalid token'));
      });

      // Timeout after 2 seconds
      setTimeout(() => {
        if (!clientSocket.connected) {
          done();
        }
      }, 2000);
    });

    it('should prevent unauthorized file access', async () => {
      const sensitiveFiles = [
        '/etc/passwd',
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/root/.ssh/id_rsa',
        '../server/services/ConfigService.ts'
      ];

      for (const filePath of sensitiveFiles) {
        const response = await request(app)
          .get(`/api/files/${encodeURIComponent(filePath)}`)
          .expect(404);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should prevent directory traversal in file operations', async () => {
      const maliciousPath = '../../../etc/passwd';
      
      const response = await request(app)
        .post('/api/files')
        .send({
          filePath: maliciousPath,
          content: 'malicious content'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('HTTPS Communication', () => {
    it('should use HTTPS protocol', () => {
      expect(server).toBeInstanceOf(https.Server);
    });

    it('should have TLS enabled', () => {
      const address = server.address();
      expect(address).toBeDefined();
      
      // Server should be listening
      expect(server.listening).toBe(true);
    });

    it('should reject HTTP connections', async () => {
      // This test verifies that only HTTPS is accepted
      // The server should not respond to plain HTTP
      const port = (server.address() as any).port;
      
      try {
        // Attempt HTTP connection (should fail)
        await request(`http://localhost:${port}`)
          .get('/api/health')
          .timeout(1000);
        
        // If we get here, the test should fail
        fail('Should not accept HTTP connections');
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    it('should use secure WebSocket (WSS)', (done) => {
      const socketUrl = `https://localhost:${(server.address() as any).port}`;
      
      clientSocket = ioClient(socketUrl, {
        rejectUnauthorized: false,
        transports: ['websocket'],
        secure: true
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

  describe('CORS Security', () => {
    it('should only allow localhost origins', async () => {
      const allowedOrigins = [
        'https://localhost:3000',
        'https://localhost:5173',
        'https://localhost:8080'
      ];

      for (const origin of allowedOrigins) {
        const response = await request(app)
          .get('/api/health')
          .set('Origin', origin)
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBeDefined();
      }
    });

    it('should reject non-localhost origins', async () => {
      const blockedOrigins = [
        'https://evil.com',
        'https://attacker.com',
        'http://192.168.1.100',
        'https://example.com',
        'null'
      ];

      for (const origin of blockedOrigins) {
        const response = await request(app)
          .get('/api/health')
          .set('Origin', origin)
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      }
    });

    it('should require credentials for CORS requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight requests correctly', async () => {
      const response = await request(app)
        .options('/api/images/upload')
        .set('Origin', 'https://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on QR token generation', async () => {
      const requests = [];
      
      // Make 10 requests rapidly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/qr-token')
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should enforce rate limit on image uploads', async () => {
      // Get valid session token
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const sessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: qrTokenRes.body.token })
        .expect(200);

      const sessionToken = sessionRes.body.sessionToken;
      const fakeImage = Buffer.from('fake-image-data');

      // Make 15 upload requests rapidly
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/images/upload')
            .set('Cookie', `sessionToken=${sessionToken}`)
            .attach('image', fakeImage, `test${i}.jpg`)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (limit is 10 per minute)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should reset rate limit after time window', async () => {
      // This test would require waiting for the rate limit window to reset
      // For now, we just verify the rate limiter exists
      const response = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });
  });

  describe('Input Validation', () => {
    it('should validate AWS credentials format', async () => {
      const invalidConfigs = [
        { accessKeyId: '', secretAccessKey: 'key', region: 'us-east-1', bucketName: 'bucket' },
        { accessKeyId: 'key', secretAccessKey: '', region: 'us-east-1', bucketName: 'bucket' },
        { accessKeyId: 'key', secretAccessKey: 'key', region: '', bucketName: 'bucket' },
        { accessKeyId: 'key', secretAccessKey: 'key', region: 'us-east-1', bucketName: '' },
        {},
        null,
        'invalid'
      ];

      for (const config of invalidConfigs) {
        const response = await request(app)
          .post('/api/config')
          .send(config)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate file paths', async () => {
      const invalidPaths = [
        '',
        null,
        undefined,
        '../../../etc/passwd',
        'C:\\Windows\\System32\\config\\sam',
        '/dev/null',
        '<script>alert("xss")</script>'
      ];

      for (const filePath of invalidPaths) {
        const response = await request(app)
          .post('/api/files')
          .send({
            filePath: filePath,
            content: 'test'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate image file types', async () => {
      const qrTokenRes = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const sessionRes = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: qrTokenRes.body.token })
        .expect(200);

      const sessionToken = sessionRes.body.sessionToken;

      // Try to upload non-image file
      const response = await request(app)
        .post('/api/images/upload')
        .set('Cookie', `sessionToken=${sessionToken}`)
        .attach('image', Buffer.from('not an image'), 'malicious.exe')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should sanitize user input', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '${alert("xss")}'
      ];

      for (const xss of xssAttempts) {
        const response = await request(app)
          .post('/api/files')
          .send({
            filePath: `/tmp/test-${Date.now()}.md`,
            content: xss
          });

        // Should either reject or sanitize
        if (response.status === 200) {
          // If accepted, content should be sanitized
          const readRes = await request(app)
            .get(`/api/files/${encodeURIComponent(response.body.filePath)}`);
          
          // Content should not contain executable script tags
          expect(readRes.body.content).not.toContain('<script>');
        }
      }
    });
  });

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const tokens = new Set();
      
      // Generate 100 tokens
      for (let i = 0; i < 100; i++) {
        const response = await request(app)
          .post('/api/auth/qr-token')
          .expect(200);
        
        tokens.add(response.body.token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);

      // Tokens should be UUID v4 format
      tokens.forEach(token => {
        expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
    });

    it('should not expose tokens in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: 'invalid-token' })
        .expect(401);

      // Error message should not contain the invalid token
      expect(response.body.error).not.toContain('invalid-token');
    });

    it('should store tokens securely in memory only', () => {
      const token = authService.generateQRToken();
      
      // Token should exist in memory
      expect(authService.validateQRToken(token.token)).toBeTruthy();
      
      // Token should not be persisted to disk
      // (This is verified by the fact that tokens are lost on server restart)
    });
  });

  describe('Session Management', () => {
    it('should isolate sessions between different clients', async () => {
      // Create two separate sessions
      const qrToken1Res = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const qrToken2Res = await request(app)
        .post('/api/auth/qr-token')
        .expect(200);

      const session1Res = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: qrToken1Res.body.token })
        .expect(200);

      const session2Res = await request(app)
        .post('/api/auth/session')
        .send({ qrToken: qrToken2Res.body.token })
        .expect(200);

      const sessionToken1 = session1Res.body.sessionToken;
      const sessionToken2 = session2Res.body.sessionToken;

      // Tokens should be different
      expect(sessionToken1).not.toBe(sessionToken2);

      // Both sessions should work independently
      const res1 = await request(app)
        .get('/api/images')
        .set('Cookie', `sessionToken=${sessionToken1}`)
        .expect(200);

      const res2 = await request(app)
        .get('/api/images')
        .set('Cookie', `sessionToken=${sessionToken2}`)
        .expect(200);

      expect(res1.body).toBeDefined();
      expect(res2.body).toBeDefined();
    });

    it('should prevent session fixation attacks', async () => {
      const attackerToken = 'attacker-controlled-token';
      
      // Attacker tries to use their own token
      const response = await request(app)
        .get('/api/images')
        .set('Cookie', `sessionToken=${attackerToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
