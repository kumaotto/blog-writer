import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../middleware/RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    rateLimiter = new RateLimiter(5, 60 * 1000); // 5 requests per minute

    mockReq = {
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
      headers: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('middleware', () => {
    it('should allow requests within limit', () => {
      const middleware = rateLimiter.middleware();

      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const middleware = rateLimiter.middleware();

      // Make 5 allowed requests
      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 6th request should be blocked
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests',
        })
      );
    });

    it('should set rate limit headers', () => {
      const middleware = rateLimiter.middleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should set Retry-After header when rate limited', () => {
      const middleware = rateLimiter.middleware();

      // Exceed limit
      for (let i = 0; i < 6; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should reset limit after time window', () => {
      const middleware = rateLimiter.middleware();

      // Exceed limit
      for (let i = 0; i < 6; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Reset and try again
      rateLimiter.reset('127.0.0.1');
      jest.clearAllMocks();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should track different IPs separately', () => {
      const middleware = rateLimiter.middleware();

      const mockReq2 = {
        ...mockReq,
        ip: '192.168.1.1',
        socket: {
          remoteAddress: '192.168.1.1',
        } as any,
      };

      // Make 5 requests from first IP
      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // Make 5 requests from second IP (should be allowed)
      for (let i = 0; i < 5; i++) {
        middleware(mockReq2 as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(10);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle X-Forwarded-For header', () => {
      const middleware = rateLimiter.middleware();

      mockReq.headers = {
        'x-forwarded-for': '10.0.0.1, 192.168.1.1',
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing IP gracefully', () => {
      const middleware = rateLimiter.middleware();

      const mockReqNoIp = {
        headers: {},
        socket: {} as any,
      };

      middleware(mockReqNoIp as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset specific identifier', () => {
      const middleware = rateLimiter.middleware();

      // Exceed limit
      for (let i = 0; i < 6; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      rateLimiter.reset('127.0.0.1');
      jest.clearAllMocks();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reset all identifiers when called without argument', () => {
      const middleware = rateLimiter.middleware();

      const mockReq2 = {
        ...mockReq,
        ip: '192.168.1.1',
        socket: {
          remoteAddress: '192.168.1.1',
        } as any,
      };

      // Exceed limit for both IPs
      for (let i = 0; i < 6; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
        middleware(mockReq2 as Request, mockRes as Response, mockNext);
      }

      rateLimiter.reset();
      jest.clearAllMocks();

      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq2 as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should automatically cleanup expired entries', () => {
      jest.useFakeTimers();

      const middleware = rateLimiter.middleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Advance time past window
      jest.advanceTimersByTime(61 * 1000);

      // Trigger cleanup (runs every minute)
      jest.advanceTimersByTime(60 * 1000);

      // Should allow new requests after cleanup
      jest.clearAllMocks();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
