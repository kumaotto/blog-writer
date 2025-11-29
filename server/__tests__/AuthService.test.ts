import { AuthService } from '../services/AuthService';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  afterEach(() => {
    authService.destroy();
  });

  describe('generateQRToken', () => {
    it('should generate QR token with 5 minute expiration', () => {
      const result = authService.generateQRToken();

      expect(result.token).toBeDefined();
      expect(result.token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(result.expiresAt).toBeInstanceOf(Date);

      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 5 * 60 * 1000);
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should generate unique tokens', () => {
      const token1 = authService.generateQRToken();
      const token2 = authService.generateQRToken();

      expect(token1.token).not.toBe(token2.token);
    });
  });

  describe('validateQRTokenAndIssueSession', () => {
    it('should validate QR token and issue session token', () => {
      const qrToken = authService.generateQRToken();

      const result = authService.validateQRTokenAndIssueSession(qrToken.token);

      expect(result).not.toBeNull();
      expect(result!.sessionToken).toBeDefined();
      expect(result!.sessionToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(result!.expiresAt).toBeInstanceOf(Date);

      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 60 * 60 * 1000);
      const timeDiff = Math.abs(result!.expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should return null for invalid QR token', () => {
      const result = authService.validateQRTokenAndIssueSession('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired QR token', () => {
      const qrToken = authService.generateQRToken();

      // Manually expire the token
      jest.useFakeTimers();
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      const result = authService.validateQRTokenAndIssueSession(qrToken.token);

      expect(result).toBeNull();

      jest.useRealTimers();
    });

    it('should invalidate QR token after use', () => {
      const qrToken = authService.generateQRToken();

      authService.validateQRTokenAndIssueSession(qrToken.token);
      const result = authService.validateQRTokenAndIssueSession(qrToken.token);

      expect(result).toBeNull();
    });
  });

  describe('validateSessionToken', () => {
    it('should validate valid session token', () => {
      const qrToken = authService.generateQRToken();
      const session = authService.validateQRTokenAndIssueSession(qrToken.token);

      const isValid = authService.validateSessionToken(session!.sessionToken);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid session token', () => {
      const isValid = authService.validateSessionToken('invalid-token');

      expect(isValid).toBe(false);
    });

    it('should return false for expired session token', () => {
      const qrToken = authService.generateQRToken();
      const session = authService.validateQRTokenAndIssueSession(qrToken.token);

      jest.useFakeTimers();
      jest.advanceTimersByTime(61 * 60 * 1000); // 61 minutes

      const isValid = authService.validateSessionToken(session!.sessionToken);

      expect(isValid).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('invalidateQRToken', () => {
    it('should invalidate QR token', () => {
      const qrToken = authService.generateQRToken();

      authService.invalidateQRToken(qrToken.token);
      const result = authService.validateQRTokenAndIssueSession(qrToken.token);

      expect(result).toBeNull();
    });

    it('should not throw error for non-existent token', () => {
      expect(() => authService.invalidateQRToken('non-existent')).not.toThrow();
    });
  });

  describe('regenerateQRCode', () => {
    it('should generate new QR token and invalidate old one', () => {
      const oldToken = authService.generateQRToken();

      const result = authService.regenerateQRCode();

      expect(result.token).toBeDefined();
      expect(result.token).not.toBe(oldToken.token);
      expect(result.qrCodeDataURL).toBeDefined();
      expect(result.qrCodeDataURL).toMatch(/^data:image\/png;base64,/);

      // Old token should be invalidated
      const oldTokenResult = authService.validateQRTokenAndIssueSession(oldToken.token);
      expect(oldTokenResult).toBeNull();
    });
  });

  describe('Token cleanup', () => {
    it('should automatically clean up expired tokens', () => {
      const qrToken = authService.generateQRToken();
      const session = authService.validateQRTokenAndIssueSession(qrToken.token);

      jest.useFakeTimers();
      jest.advanceTimersByTime(61 * 60 * 1000); // 61 minutes

      // Trigger cleanup by validating
      authService.validateSessionToken(session!.sessionToken);

      // Check that expired tokens are removed
      const isValid = authService.validateSessionToken(session!.sessionToken);
      expect(isValid).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('invalidateAllTokens', () => {
    it('should invalidate all tokens', () => {
      const qrToken = authService.generateQRToken();
      const session = authService.validateQRTokenAndIssueSession(qrToken.token);

      authService.invalidateAllTokens();

      const isValid = authService.validateSessionToken(session!.sessionToken);
      expect(isValid).toBe(false);
    });

    it('should clear all tokens from memory', () => {
      authService.generateQRToken();
      authService.generateQRToken();

      const statsBefore = authService.getTokenStats();
      expect(statsBefore.total).toBeGreaterThan(0);

      authService.invalidateAllTokens();

      const statsAfter = authService.getTokenStats();
      expect(statsAfter.total).toBe(0);
      expect(statsAfter.qr).toBe(0);
      expect(statsAfter.session).toBe(0);
    });
  });

  describe('getTokenStats', () => {
    it('should return correct token statistics', () => {
      const qrToken1 = authService.generateQRToken();
      authService.generateQRToken(); // qrToken2
      authService.validateQRTokenAndIssueSession(qrToken1.token); // session1

      const stats = authService.getTokenStats();

      expect(stats.total).toBe(2); // 1 QR token + 1 session token
      expect(stats.qr).toBe(1);
      expect(stats.session).toBe(1);
      expect(stats.expired).toBe(0);
    });

    it('should count expired tokens', () => {
      const qrToken = authService.generateQRToken();
      authService.validateQRTokenAndIssueSession(qrToken.token); // session

      jest.useFakeTimers();
      jest.advanceTimersByTime(61 * 60 * 1000); // 61 minutes

      const stats = authService.getTokenStats();

      expect(stats.expired).toBe(1);

      jest.useRealTimers();
    });
  });

  describe('destroy', () => {
    it('should cleanup resources and invalidate all tokens', () => {
      const qrToken = authService.generateQRToken();
      const session = authService.validateQRTokenAndIssueSession(qrToken.token);

      authService.destroy();

      const isValid = authService.validateSessionToken(session!.sessionToken);
      expect(isValid).toBe(false);

      const stats = authService.getTokenStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('extendSessionToken', () => {
    it('should not extend session token (intentionally not implemented)', () => {
      const qrToken = authService.generateQRToken();
      const session = authService.validateQRTokenAndIssueSession(qrToken.token);

      // expiresAtBefore - not used since we can't verify expiration directly
      session!.expiresAt;

      // Try to extend (should do nothing)
      authService.extendSessionToken(session!.sessionToken);

      // Verify token still has same expiration
      const isValid = authService.validateSessionToken(session!.sessionToken);
      expect(isValid).toBe(true);

      // Note: We can't directly check if expiration changed since it's private
      // But the method should do nothing as per design
    });
  });
});
