/**
 * Server-side rate limiter for Supabase Edge Functions
 * Provides IP-based and endpoint-specific rate limiting with security features
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  violations: number;
  firstSeen: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number; // How long to block after violations
  maxViolations?: number; // Number of violations before blocking
}

interface SecurityMetrics {
  ip: string;
  userAgent: string;
  endpoint: string;
  timestamp: number;
  blocked: boolean;
  violationCount?: number;
}

class EdgeRateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private blockedIPs = new Map<string, number>(); // IP -> unblock timestamp
  
  /**
   * Check if request is allowed under rate limit
   */
  checkLimit(
    ip: string, 
    endpoint: string, 
    config: RateLimitConfig,
    userAgent?: string
  ): { allowed: boolean; remaining: number; resetTime: number; metrics: SecurityMetrics } {
    const now = Date.now();
    const key = `${ip}:${endpoint}`;
    
    // Check if IP is currently blocked
    const blockedUntil = this.blockedIPs.get(ip);
    if (blockedUntil && now < blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: blockedUntil,
        metrics: {
          ip,
          userAgent: userAgent || 'unknown',
          endpoint,
          timestamp: now,
          blocked: true
        }
      };
    }
    
    // Remove expired block
    if (blockedUntil && now >= blockedUntil) {
      this.blockedIPs.delete(ip);
    }
    
    const entry = this.limits.get(key);
    
    // Reset or create new entry if window expired
    if (!entry || now >= entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        violations: entry?.violations || 0,
        firstSeen: entry?.firstSeen || now
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
        metrics: {
          ip,
          userAgent: userAgent || 'unknown',
          endpoint,
          timestamp: now,
          blocked: false
        }
      };
    }
    
    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      // Increment violations
      entry.violations++;
      
      // Block IP if too many violations
      const maxViolations = config.maxViolations || 5;
      const blockDuration = config.blockDurationMs || 900000; // 15 minutes default
      
      if (entry.violations >= maxViolations) {
        this.blockedIPs.set(ip, now + blockDuration);
        console.error(`🚫 [rate-limiter] IP blocked for violations: ${ip} (${entry.violations} violations)`);
      }
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        metrics: {
          ip,
          userAgent: userAgent || 'unknown',
          endpoint,
          timestamp: now,
          blocked: false,
          violationCount: entry.violations
        }
      };
    }
    
    // Increment counter
    entry.count++;
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
      metrics: {
        ip,
        userAgent: userAgent || 'unknown',
        endpoint,
        timestamp: now,
        blocked: false
      }
    };
  }
  
  /**
   * Clean up expired entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean rate limit entries
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key);
      }
    }
    
    // Clean blocked IPs
    for (const [ip, unblockTime] of this.blockedIPs.entries()) {
      if (now >= unblockTime) {
        this.blockedIPs.delete(ip);
      }
    }
  }
  
  /**
   * Get current stats for monitoring
   */
  getStats(): { totalEntries: number; blockedIPs: number; memoryMB: number } {
    return {
      totalEntries: this.limits.size,
      blockedIPs: this.blockedIPs.size,
      memoryMB: Math.round((this.limits.size * 100 + this.blockedIPs.size * 50) / 1024 / 1024 * 100) / 100
    };
  }
}

// Global rate limiter instance
export const rateLimiter = new EdgeRateLimiter();

// Cleanup every 10 minutes
setInterval(() => rateLimiter.cleanup(), 600000);

/**
 * Extract client IP from request headers
 */
export function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         req.headers.get("cf-connecting-ip") ||
         req.headers.get("x-real-ip") ||
         "unknown";
}

/**
 * Rate limit middleware for edge functions
 */
export function withRateLimit(
  endpoint: string,
  config: RateLimitConfig,
  corsHeaders: Record<string, string>
) {
  return function(req: Request): Response | null {
    const ip = getClientIP(req);
    const userAgent = req.headers.get("user-agent") || undefined;
    
    const result = rateLimiter.checkLimit(ip, endpoint, config, userAgent);
    
    // Log security metrics
    if (!result.allowed || result.metrics.violationCount) {
      console.warn(`🔒 [rate-limiter] ${endpoint}: IP ${ip} ${result.allowed ? 'near limit' : 'blocked'} - ${result.remaining} remaining`);
    }
    
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          retryAfter: retryAfter,
          endpoint: endpoint
        }), 
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
          }
        }
      );
    }
    
    return null; // Allow request to proceed
  };
}

/**
 * Predefined rate limit configs for common use cases
 */
export const RATE_LIMITS = {
  // Form submissions - 5 per minute per IP
  FORM_SUBMISSION: {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    blockDurationMs: 300000, // 5 minutes
    maxViolations: 3
  },
  
  // Event tracking - 20 per minute per IP  
  EVENT_TRACKING: {
    maxRequests: 20,
    windowMs: 60000, // 1 minute
    blockDurationMs: 600000, // 10 minutes
    maxViolations: 5
  },
  
  // Public API - 60 per minute per IP
  PUBLIC_API: {
    maxRequests: 60,
    windowMs: 60000, // 1 minute  
    blockDurationMs: 300000, // 5 minutes
    maxViolations: 3
  },
  
  // Webhook endpoints - 100 per minute per IP (higher for legitimate services)
  WEBHOOK: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    blockDurationMs: 1800000, // 30 minutes
    maxViolations: 10
  }
} as const;

/**
 * Enhanced request validation utilities
 */
export class RequestValidator {
  static validateContentLength(req: Request, maxBytes: number): string | null {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > maxBytes) {
      return `Request too large (max ${maxBytes} bytes)`;
    }
    return null;
  }
  
  static validateContentType(req: Request, allowedTypes: string[]): string | null {
    const contentType = req.headers.get("content-type");
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return `Invalid content type (allowed: ${allowedTypes.join(", ")})`;
    }
    return null;
  }
  
  static validateOrigin(req: Request, allowedOrigins: string[]): string | null {
    const origin = req.headers.get("Origin") || req.headers.get("origin");
    if (origin && allowedOrigins.length && !allowedOrigins.includes("*") && !allowedOrigins.includes(origin)) {
      return "Origin not allowed";
    }
    return null;
  }
  
  static detectSuspiciousPatterns(userAgent?: string, ip?: string): string[] {
    const warnings: string[] = [];
    
    if (userAgent) {
      // Common bot/scanner patterns
      const suspiciousUA = /bot|crawl|spider|scan|hack|exploit|injection|payload/i;
      if (suspiciousUA.test(userAgent)) {
        warnings.push("Suspicious user agent");
      }
      
      // Empty or very short user agents
      if (userAgent.length < 10) {
        warnings.push("Suspicious user agent length");
      }
    }
    
    // Private IP ranges accessing public endpoints
    if (ip && ip !== "unknown") {
      const privateIPPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|localhost)/;
      if (privateIPPattern.test(ip)) {
        warnings.push("Request from private IP");
      }
    }
    
    return warnings;
  }
}