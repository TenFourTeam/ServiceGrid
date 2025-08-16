/**
 * Authentication monitoring and debugging utilities
 */

export interface AuthEvent {
  type: 'token_refresh' | 'auth_error' | 'sign_in' | 'sign_out' | 'session_expired';
  timestamp: Date;
  details?: any;
  success?: boolean;
}

class AuthMonitor {
  private events: AuthEvent[] = [];
  private maxEvents = 50; // Keep last 50 events

  log(event: Omit<AuthEvent, 'timestamp'>) {
    const authEvent: AuthEvent = {
      ...event,
      timestamp: new Date(),
    };
    
    this.events.unshift(authEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.info('[AuthMonitor]', authEvent);
    }
  }

  getEvents(): AuthEvent[] {
    return [...this.events];
  }

  getRecentEvents(count: number = 10): AuthEvent[] {
    return this.events.slice(0, count);
  }

  getErrorEvents(): AuthEvent[] {
    return this.events.filter(e => e.success === false || e.type === 'auth_error');
  }

  clear() {
    this.events = [];
  }

  // Get auth health metrics
  getHealthMetrics() {
    const recent = this.getRecentEvents(20);
    const errors = recent.filter(e => e.success === false);
    const tokenRefreshes = recent.filter(e => e.type === 'token_refresh');
    const successfulRefreshes = tokenRefreshes.filter(e => e.success !== false);
    
    return {
      totalEvents: recent.length,
      errorRate: recent.length > 0 ? errors.length / recent.length : 0,
      tokenRefreshSuccessRate: tokenRefreshes.length > 0 
        ? successfulRefreshes.length / tokenRefreshes.length 
        : 1,
      lastError: errors[0] || null,
      lastActivity: recent[0]?.timestamp || null,
    };
  }
}

export const authMonitor = new AuthMonitor();

// Development-only global access
if (process.env.NODE_ENV === 'development') {
  (window as any).authMonitor = authMonitor;
}
