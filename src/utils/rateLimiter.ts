import { RateLimitedFunction } from '@/types/api';

/**
 * Simple in-memory rate limiter for client-side use
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  
  /**
   * Check if action is allowed under rate limit
   * @param key - unique identifier (e.g., userId, endpoint)
   * @param maxRequests - max requests allowed
   * @param windowMs - time window in milliseconds
   */
  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    if (!entry || now >= entry.resetTime) {
      // Reset or create new entry
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }
    
    if (entry.count >= maxRequests) {
      return false; // Rate limited
    }
    
    entry.count++;
    return true;
  }
  
  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, maxRequests: number): number {
    const entry = this.limits.get(key);
    if (!entry || Date.now() >= entry.resetTime) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - entry.count);
  }
  
  /**
   * Clear all rate limit entries (useful for testing)
   */
  clear(): void {
    this.limits.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Rate limit decorator for async functions
 */
export function withRateLimit<TArgs extends unknown[], TReturn>(
  fn: RateLimitedFunction<TArgs, TReturn>,
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitedFunction<TArgs, TReturn> {
  return (async (...args: TArgs) => {
    if (!rateLimiter.isAllowed(key, maxRequests, windowMs)) {
      throw new Error(`Rate limit exceeded for ${key}. Try again later.`);
    }
    return fn(...args);
  }) as RateLimitedFunction<TArgs, TReturn>;
}