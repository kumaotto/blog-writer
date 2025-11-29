import request from 'supertest';
import { createServer } from '../server';
import https from 'https';
import { Express } from 'express';

describe('Express Server', () => {
  let server: https.Server;
  let app: Express;

  beforeAll(() => {
    const { app: testApp, server: testServer } = createServer();
    app = testApp;
    server = testServer;
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Basic Server Setup', () => {
    it('should start HTTPS server', () => {
      expect(server).toBeDefined();
      expect(server.listening).toBe(true);
    });

    it('should respond to health check', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow localhost origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should reject non-localhost origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://example.com');
      
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should allow credentials', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://localhost:3000');
      
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('HTTPS Configuration', () => {
    it('should use HTTPS protocol', () => {
      const address = server.address();
      expect(address).toBeDefined();
    });
  });
});
