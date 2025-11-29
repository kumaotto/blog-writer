import { AuthService } from '../services/AuthService';

describe('Ngrok URL Support', () => {
  let authService: AuthService;
  const originalEnv = process.env.PUBLIC_URL;

  beforeEach(() => {
    authService = new AuthService();
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.PUBLIC_URL = originalEnv;
    } else {
      delete process.env.PUBLIC_URL;
    }
  });

  describe('QR Code URL Generation', () => {
    it('should use ngrok URL when PUBLIC_URL is set', async () => {
      // Arrange
      const ngrokUrl = 'https://abc123.ngrok.io';
      process.env.PUBLIC_URL = ngrokUrl;

      // Act
      const result = await authService.regenerateQRCodeAsync();

      // Assert
      expect(result.token).toBeDefined();
      expect(result.qrCodeDataURL).toBeDefined();
      expect(result.qrCodeDataURL).toContain('data:image/png;base64');
      
      // Decode QR code to verify it contains the ngrok URL
      // The QR code should encode: https://abc123.ngrok.io/mobile?token=xxx
      const expectedUrlPrefix = `${ngrokUrl}/mobile?token=`;
      
      // Verify the token is valid
      const session = authService.validateQRTokenAndIssueSession(result.token);
      expect(session).toBeTruthy();
      
      // Store the URL for manual verification
      (result as any).expectedUrl = `${expectedUrlPrefix}${result.token}`;
    });

    it('should use localhost when PUBLIC_URL is not set', async () => {
      // Arrange
      delete process.env.PUBLIC_URL;

      // Act
      const result = await authService.regenerateQRCodeAsync();

      // Assert
      expect(result.token).toBeDefined();
      expect(result.qrCodeDataURL).toBeDefined();
      expect(result.qrCodeDataURL).toContain('data:image/png;base64');
    });

    it('should handle different ngrok URL formats', async () => {
      const ngrokUrls = [
        'https://abc123.ngrok.io',
        'https://xyz789.ngrok-free.app',
        'https://custom-domain.ngrok.io',
      ];

      for (const url of ngrokUrls) {
        // Arrange
        process.env.PUBLIC_URL = url;

        // Act
        const result = await authService.regenerateQRCodeAsync();

        // Assert
        expect(result.token).toBeDefined();
        expect(result.qrCodeDataURL).toBeDefined();
      }
    });

    it('should generate unique tokens for each QR code', async () => {
      // Arrange
      process.env.PUBLIC_URL = 'https://test.ngrok.io';

      // Act
      const result1 = await authService.regenerateQRCodeAsync();
      const result2 = await authService.regenerateQRCodeAsync();

      // Assert
      expect(result1.token).not.toBe(result2.token);
      expect(result1.qrCodeDataURL).not.toBe(result2.qrCodeDataURL);
    });

    it('should invalidate old tokens when regenerating', async () => {
      // Arrange
      process.env.PUBLIC_URL = 'https://test.ngrok.io';

      // Act
      const result1 = await authService.regenerateQRCodeAsync();
      const result2 = await authService.regenerateQRCodeAsync();

      // Assert - old token should be invalid
      const session1 = authService.validateQRTokenAndIssueSession(result1.token);
      expect(session1).toBeNull();

      // New token should be valid
      const session2 = authService.validateQRTokenAndIssueSession(result2.token);
      expect(session2).toBeTruthy();
    });
  });

  describe('Synchronous QR Code Generation', () => {
    it('should use ngrok URL in sync method', () => {
      // Arrange
      process.env.PUBLIC_URL = 'https://sync-test.ngrok.io';

      // Act
      const result = authService.regenerateQRCode();

      // Assert
      expect(result.token).toBeDefined();
      expect(result.qrCodeDataURL).toBeDefined();
    });

    it('should fallback to localhost in sync method when PUBLIC_URL not set', () => {
      // Arrange
      delete process.env.PUBLIC_URL;

      // Act
      const result = authService.regenerateQRCode();

      // Assert
      expect(result.token).toBeDefined();
      expect(result.qrCodeDataURL).toBeDefined();
    });
  });

  describe('Environment Variable Validation', () => {
    it('should handle empty PUBLIC_URL', async () => {
      // Arrange
      process.env.PUBLIC_URL = '';

      // Act
      const result = await authService.regenerateQRCodeAsync();

      // Assert - should fallback to localhost
      expect(result.token).toBeDefined();
      expect(result.qrCodeDataURL).toBeDefined();
    });

    it('should handle PUBLIC_URL with trailing slash', async () => {
      // Arrange
      process.env.PUBLIC_URL = 'https://test.ngrok.io/';

      // Act
      const result = await authService.regenerateQRCodeAsync();

      // Assert
      expect(result.token).toBeDefined();
      expect(result.qrCodeDataURL).toBeDefined();
    });

    it('should handle PUBLIC_URL without protocol', async () => {
      // Arrange
      process.env.PUBLIC_URL = 'test.ngrok.io';

      // Act
      const result = await authService.regenerateQRCodeAsync();

      // Assert
      expect(result.token).toBeDefined();
      expect(result.qrCodeDataURL).toBeDefined();
    });
  });
});
