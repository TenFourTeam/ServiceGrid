import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { AuthSnapshot, AuthPhase, AuthContextValue, AuthBootstrapResult, TenantRole } from "./types";
// Bootstrap will use ApiClient after initial setup

const AuthContext = createContext<AuthContextValue | null>(null);

// Event bus for auth state changes
const authEventBus = new EventTarget();

function createInitialSnapshot(): AuthSnapshot {
  return {
    phase: 'loading',
    roles: [],
    claimsVersion: 0,
    lastActivityAt: Date.now(),
  };
}

export function AuthKernel({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken, signOut: clerkSignOut } = useClerkAuth();
  const { user } = useUser();
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(createInitialSnapshot);
  const bootstrapRanRef = useRef(false);
  const tokenRefreshTimeoutRef = useRef<NodeJS.Timeout>();
  const activityTimeoutRef = useRef<NodeJS.Timeout>();

  // Event emitter helper
  const emit = useCallback((event: string, data?: any) => {
    authEventBus.dispatchEvent(new CustomEvent(event, { detail: data }));
  }, []);

  // Token refresh scheduler
  const scheduleTokenRefresh = useCallback(async (token: string) => {
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }

    try {
      // Decode JWT to get expiration (simple base64 decode)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = exp - now;
      
      // Schedule refresh 60 seconds before expiry
      const refreshIn = Math.max(0, timeUntilExpiry - 60000);
      
      tokenRefreshTimeoutRef.current = setTimeout(async () => {
        try {
        const { getApiToken } = await import('@/auth/token');
        const newToken = await getApiToken({ refresh: true });
          if (newToken) {
            setSnapshot(prev => ({ ...prev, token: newToken }));
            emit('auth:token_refreshed', { ageSec: (Date.now() - now) / 1000 });
            scheduleTokenRefresh(newToken);
          }
        } catch (error) {
          console.warn('[AuthKernel] Token refresh failed:', error);
          emit('auth:error', { code: 'token_refresh_failed', error });
        }
      }, refreshIn);
    } catch (error) {
      console.warn('[AuthKernel] Invalid token for scheduling:', error);
    }
  }, [getToken, emit]);

  // Bootstrap process - await tenant/role data
  const runBootstrap = useCallback(async (): Promise<AuthBootstrapResult | null> => {
    try {
      // Import the simplified token helper
      const { getApiTokenStrict } = await import('@/auth/token');
      const token = await getApiTokenStrict({ refresh: true });

      // Use direct fetch for business since ApiClient isn't ready yet
      console.log("[AuthKernel] Starting get-business with token...");
      const response = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/get-business`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      
      console.log("[AuthKernel] Bootstrap response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[AuthKernel] Bootstrap failed with response:", errorText);
        throw new Error(`Bootstrap failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log("[AuthKernel] Bootstrap result:", result);

      emit('auth:bootstrap_ok');
      return {
        tenantId: result.business?.id || 'default',
        roles: [result.business?.role || 'worker'] as TenantRole[],
        businessId: result.business?.id || 'default',
        businessName: result.business?.name || 'ServiceGrid'
      };
        } catch (error: any) {
      console.error('[AuthKernel] Bootstrap failed:', error);
      
      // Handle specific error types
      if (error.message === 'AUTH_NO_JWT') {
        emit('auth:error', { code: 'AUTH_NO_JWT', error: 'No authentication token available' });
        setSnapshot(prev => ({ ...prev, phase: 'signed_out' }));
      } else {
        emit('auth:error', { code: 'bootstrap_failed', error });
      }
      return null;
    }
  }, [getToken, emit]);

  // Activity tracking for idle lock
  const resetActivityTimer = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    setSnapshot(prev => ({ ...prev, lastActivityAt: Date.now() }));

    // Lock after 20 minutes of inactivity
    activityTimeoutRef.current = setTimeout(() => {
      setSnapshot(prev => ({ ...prev, phase: 'locked' }));
      emit('auth:idle_locked');
    }, 20 * 60 * 1000);
  }, [emit]);

  // Lock auth manually
  const lockAuth = useCallback(() => {
    setSnapshot(prev => ({ ...prev, phase: 'locked' }));
    emit('auth:idle_locked');
  }, [emit]);

  // Sign out handler
  const signOut = useCallback(async () => {
    try {
      await clerkSignOut();
      setSnapshot(createInitialSnapshot());
      emit('auth:signed_out');
    } catch (error) {
      console.error('[AuthKernel] Sign out failed:', error);
    }
  }, [clerkSignOut, emit]);

  // Force refresh auth state
  const refreshAuth = useCallback(async () => {
    try {
      if (!isSignedIn) return;
      
      const bootstrap = await runBootstrap();
      if (bootstrap) {
        const { getApiToken } = await import('@/auth/token');
        const token = await getApiToken({ refresh: true });
        if (!token) throw new Error('AUTH_NO_JWT');

        setSnapshot(prev => ({
          ...prev,
          phase: 'authenticated',
          tenantId: bootstrap.tenantId,
          roles: bootstrap.roles,
          claimsVersion: prev.claimsVersion + 1,
          token,
          // Update business context
          businessId: bootstrap.businessId,
          businessName: bootstrap.businessName,
          business: {
            id: bootstrap.businessId,
            name: bootstrap.businessName,
          },
        }));
        
        if (token) {
          scheduleTokenRefresh(token);
        }
      }
    } catch (error: any) {
      console.error('[AuthKernel] Auth refresh failed:', error);
      
      // Handle specific error types  
      if (error.message === 'AUTH_NO_JWT') {
        emit('auth:error', { code: 'AUTH_NO_JWT', error: 'No authentication token available' });
        setSnapshot(prev => ({ ...prev, phase: 'signed_out' }));
      } else {
        emit('auth:error', { code: 'refresh_failed', error });
      }
      throw error;
    }
  }, [isSignedIn, runBootstrap, scheduleTokenRefresh, emit]);

  // Main auth state management
  useEffect(() => {
    if (!isLoaded) {
      setSnapshot(prev => ({ ...prev, phase: 'loading' }));
      return;
    }

    if (!isSignedIn) {
      setSnapshot(prev => ({ ...prev, phase: 'signed_out' }));
      bootstrapRanRef.current = false;
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      return;
    }

    // User is signed in - run bootstrap if not already done
    if (!bootstrapRanRef.current) {
      bootstrapRanRef.current = true;
      
      const initializeAuth = async () => {
        const bootstrap = await runBootstrap();
        if (bootstrap) {
          const { getApiToken } = await import('@/auth/token');
          const token = await getApiToken({ refresh: true });
          
          setSnapshot(prev => ({
            ...prev,
            phase: 'authenticated',
            userId: userId || undefined,
            email: user?.primaryEmailAddress?.emailAddress,
            tenantId: bootstrap.tenantId,
            roles: bootstrap.roles,
            claimsVersion: 1,
            token,
            lastActivityAt: Date.now(),
            // Add business context
            businessId: bootstrap.businessId,
            businessName: bootstrap.businessName,
            business: {
              id: bootstrap.businessId,
              name: bootstrap.businessName,
            },
          }));

          if (token) {
            scheduleTokenRefresh(token);
          }

          // Start activity tracking
          resetActivityTimer();
        } else {
          // Bootstrap failed - keep in loading to show error
          setSnapshot(prev => ({ ...prev, phase: 'loading' }));
        }
      };

      initializeAuth();
    }
  }, [isLoaded, isSignedIn, userId, user, runBootstrap, getToken, scheduleTokenRefresh, resetActivityTimer]);

  // Activity event listeners
  useEffect(() => {
    if (snapshot.phase === 'authenticated') {
      const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
      
      events.forEach(event => {
        document.addEventListener(event, resetActivityTimer, { passive: true });
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, resetActivityTimer);
        });
      };
    }
  }, [snapshot.phase, resetActivityTimer]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: AuthContextValue = {
    snapshot,
    refreshAuth,
    lockAuth,
    signOut,
    emit,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSnapshot() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthSnapshot must be used within AuthKernel');
  }
  return context;
}

// Event bus subscription hook
export function useAuthEvent(event: string, handler: (data?: any) => void) {
  useEffect(() => {
    const listener = (e: Event) => {
      handler((e as CustomEvent).detail);
    };
    
    authEventBus.addEventListener(event, listener);
    return () => authEventBus.removeEventListener(event, listener);
  }, [event, handler]);
}
