import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useBusinessAuth } from "@/hooks/useBusinessAuth";
import { useLifecycleEmailTriggers } from "@/hooks/useLifecycleEmailTriggers";

// Logging helper with timestamps
function authLog(category: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(`[${timestamp}] [QueryClientAuth:${category}] ${message}`, data ? data : '');
}

/**
 * Integrates QueryClient with auth state changes
 * - Clears cache on sign out
 * - Refetches queries on auth changes
 * - Handles token expiration recovery
 * - Detects stale sessions and triggers logout
 */
export function QueryClientAuthIntegration() {
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const { refreshSession, logout } = useBusinessAuth();
  const previousSignedInRef = useRef<boolean | null>(null);
  
  // Lifecycle email triggers - only activate when auth is ready and user is signed in
  useLifecycleEmailTriggers(isLoaded && isSignedIn);

  // Subscribe to query cache for auth errors
  useEffect(() => {
    authLog('INIT', 'Setting up query cache subscription');
    
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        const error = event.query.state.error as Error;
        if (error?.message === 'AUTH_INVALID') {
          authLog('CACHE', 'AUTH_INVALID detected in query cache - logging out');
          queryClient.clear();
          logout();
        }
      }
    });
    
    return () => {
      authLog('INIT', 'Cleaning up query cache subscription');
      unsubscribe();
    };
  }, [queryClient, logout]);

  // Clear cache on sign out and invalidate queries on sign in
  useEffect(() => {
    if (!isLoaded) {
      authLog('STATE', 'Auth not loaded yet, skipping cache operations');
      return;
    }
    
    const wasSignedIn = previousSignedInRef.current;
    previousSignedInRef.current = isSignedIn;

    authLog('STATE', 'Auth state check', { wasSignedIn, isSignedIn });

    if (!isSignedIn && wasSignedIn) {
      authLog('CACHE', 'User signed out - clearing all cache');
      queryClient.clear();
    } else if (isSignedIn && wasSignedIn === false) {
      authLog('CACHE', 'User signed in - invalidating user-businesses queries');
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
    }
  }, [isLoaded, isSignedIn, queryClient]);

  // Simplified token handling - refresh session periodically
  useEffect(() => {
    if (!isSignedIn) {
      authLog('REFRESH', 'Not signed in, skipping refresh interval setup');
      return;
    }

    authLog('REFRESH', 'Setting up 10-minute session refresh interval');

    // Set up session refresh (every 10 minutes)
    const refreshInterval = setInterval(async () => {
      authLog('REFRESH', 'Periodic session refresh triggered');
      
      try {
        const success = await refreshSession();
        if (success) {
          authLog('REFRESH', 'Session refreshed successfully');
        } else {
          authLog('REFRESH', 'Session refresh failed - logging out');
          queryClient.clear();
          logout();
        }
      } catch (error) {
        authLog('REFRESH', 'Session refresh error', { error: (error as Error)?.message });
        queryClient.clear();
        logout();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      authLog('REFRESH', 'Cleaning up refresh interval');
      clearInterval(refreshInterval);
    };
  }, [isSignedIn, refreshSession, queryClient, logout]);

  return null; // This is a side-effect only component
}
