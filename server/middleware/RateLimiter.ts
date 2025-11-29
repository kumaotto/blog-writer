import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

/**
 * RateLimiter - Simple in-memory rate limiter
 * Tracks requests per IP address with configurable limits
 */
export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Middleware to check rate limit
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = this.getIdentifier(req);
      const now = new Date();

      let entry = this.requests.get(identifier);

      // Create new entry if doesn't exist or expired
      if (!entry || entry.resetAt < now) {
        entry = {
          count: 0,
          resetAt: new Date(now.getTime() + this.windowMs),
        };
        this.requests.set(identifier, entry);
      }

      // Increment count
      entry.count++;

      // Check if limit exceeded
      if (entry.count > this.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter,
        });
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (this.maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', entry.resetAt.toISOString());

      next();
    };
  }

  /**
   * Get identifier for rate limiting (IP address)
   */
  private getIdentifier(req: Request): string {
    // Try to get real IP from headers (for proxies)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetAt < now) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for specific identifier (for testing)
   */
  reset(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
    } else {
      this.requests.clear();
    }
  }
}
