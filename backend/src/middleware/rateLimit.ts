import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs?: number;      // Time window in milliseconds
  maxRequests?: number;   // Max requests per window
  message?: string;       // Error message
  keyGenerator?: (req: Request) => string;  // Function to generate key
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// In-memory store for rate limit data
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

/**
 * Create rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000,  // 15 minutes default
    maxRequests = 100,          // 100 requests per window
    message = 'Too many requests, please try again later',
    keyGenerator = (req: Request) => req.ip || 'unknown',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `rate:${keyGenerator(req)}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    // Create new entry if doesn't exist or has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());

    // Check if over limit
    if (entry.count > maxRequests) {
      logger.warn('Rate limit exceeded', { 
        ip: req.ip, 
        path: req.path,
        count: entry.count,
      });

      res.status(429).json({
        success: false,
        error: message,
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * Stricter rate limit for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 10,            // 10 login attempts
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req) => `auth:${req.ip}:${req.body?.email || 'unknown'}`,
});

/**
 * General API rate limit
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 60,            // 60 requests per minute
  message: 'Too many requests, please slow down',
});

/**
 * Strict rate limit for expensive operations
 */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 20,            // 20 requests per hour
  message: 'Rate limit exceeded for this operation',
});

/**
 * Rate limit by user ID (for authenticated endpoints)
 */
export function userRateLimit(options: Omit<RateLimitOptions, 'keyGenerator'> = {}) {
  return rateLimit({
    ...options,
    keyGenerator: (req: any) => `user:${req.user?.userId || req.ip}`,
  });
}





