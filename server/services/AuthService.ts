import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { Token } from '../types';

/**
 * AuthService - Token generation and validation
 * Manages QR tokens (5 min) and session tokens (1 hour)
 */
export class AuthService {
  private tokens: Map<string, Token> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Automatic cleanup every 5 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 5 * 60 * 1000);
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.invalidateAllTokens();
  }

  /**
   * Invalidate all tokens (called on server restart)
   */
  invalidateAllTokens(): void {
    this.tokens.clear();
  }

  /**
   * Get token statistics (for monitoring)
   */
  getTokenStats(): { total: number; qr: number; session: number; expired: number } {
    const now = new Date();
    let qr = 0;
    let session = 0;
    let expired = 0;

    for (const token of this.tokens.values()) {
      if (token.expiresAt < now) {
        expired++;
      } else if (token.type === 'qr') {
        qr++;
      } else if (token.type === 'session') {
        session++;
      }
    }

    return { total: this.tokens.size, qr, session, expired };
  }

  /**
   * Generate QR token (5 minute expiration)
   */
  generateQRToken(): { token: string; expiresAt: Date } {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    this.tokens.set(token, {
      value: token,
      type: 'qr',
      expiresAt,
      createdAt: new Date(),
    });

    this.cleanupExpiredTokens();

    return { token, expiresAt };
  }

  /**
   * Validate QR token and issue session token (1 hour expiration)
   */
  validateQRTokenAndIssueSession(qrToken: string): { sessionToken: string; expiresAt: Date } | null {
    const token = this.tokens.get(qrToken);

    if (!token || token.type !== 'qr') {
      return null;
    }

    if (token.expiresAt < new Date()) {
      this.tokens.delete(qrToken);
      return null;
    }

    // Invalidate QR token after use (one-time use)
    this.tokens.delete(qrToken);

    // Issue session token
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    this.tokens.set(sessionToken, {
      value: sessionToken,
      type: 'session',
      expiresAt,
      createdAt: new Date(),
    });

    return { sessionToken, expiresAt };
  }

  /**
   * Validate session token
   */
  validateSessionToken(sessionToken: string): boolean {
    const token = this.tokens.get(sessionToken);

    if (!token || token.type !== 'session') {
      return false;
    }

    if (token.expiresAt < new Date()) {
      this.tokens.delete(sessionToken);
      return false;
    }

    return true;
  }

  /**
   * Invalidate QR token
   */
  invalidateQRToken(qrToken: string): void {
    this.tokens.delete(qrToken);
  }

  /**
   * Regenerate QR code (invalidate all existing QR tokens and create new one)
   */
  async regenerateQRCodeAsync(): Promise<{ token: string; qrCodeDataURL: string }> {
    // Invalidate all existing QR tokens
    for (const [key, token] of this.tokens.entries()) {
      if (token.type === 'qr') {
        this.tokens.delete(key);
      }
    }

    // Generate new QR token
    const { token } = this.generateQRToken();

    // Generate QR code data URL (use port 3000 for Vite dev server)
    const url = `https://localhost:3000/mobile?token=${token}`;
    const qrCodeDataURL = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', width: 300 });

    return { token, qrCodeDataURL };
  }

  /**
   * Regenerate QR code (synchronous wrapper for testing)
   */
  regenerateQRCode(): { token: string; qrCodeDataURL: string } {
    // Invalidate all existing QR tokens
    for (const [key, token] of this.tokens.entries()) {
      if (token.type === 'qr') {
        this.tokens.delete(key);
      }
    }

    // Generate new QR token
    const { token } = this.generateQRToken();

    // Generate placeholder QR code data URL for synchronous use
    const qrCodeDataURL = 'data:image/png;base64,placeholder';

    return { token, qrCodeDataURL };
  }

  /**
   * Clean up expired tokens (prevents memory leaks)
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, token] of this.tokens.entries()) {
      if (token.expiresAt < now) {
        this.tokens.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired tokens`);
    }
  }

  /**
   * Extend session token expiration (NOT IMPLEMENTED - tokens have fixed expiration)
   * This method is kept for interface compatibility but does nothing
   * as per design: tokens expire after 1 hour without extension
   */
  extendSessionToken(_sessionToken: string): void {
    // Intentionally not implemented - tokens have fixed expiration
    // Users must re-scan QR code after session expires
  }
}

