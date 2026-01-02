import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useBusinessAuth } from "@/hooks/useBusinessAuth";
import { useLifecycleEmailTriggers } from "@/hooks/useLifecycleEmailTriggers";

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
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        const error = event.query.state.error as Error;
        if (error?.message === 'AUTH_INVALID') {
          console.warn('[QueryClientAuthIntegration] Auth invalid detected, logging out');
          queryClient.clear();
          logout();
        }
      }
    });
    return () => unsubscribe();
  }, [queryClient, logout]);

  // Clear cache on sign out and invalidate queries on sign in
  useEffect(() => {
    if (!isLoaded) return;
    
    const wasSignedIn = previousSignedInRef.current;
    previousSignedInRef.current = isSignedIn;

    if (!isSignedIn && wasSignedIn) {
      // User signed out - clear all cached data
      console.log('[QueryClientAuthIntegration] User signed out, clearing cache');
      queryClient.clear();
    } else if (isSignedIn && wasSignedIn === false) {
      // User just signed in - invalidate and refetch user-businesses
      console.log('[QueryClientAuthIntegration] User signed in, invalidating user-businesses');
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
    }
  }, [isLoaded, isSignedIn, queryClient]);

  // Simplified token handling - refresh session periodically
  useEffect(() => {
    if (!isSignedIn) return;

    // Set up session refresh (every 10 minutes)
    const refreshInterval = setInterval(async () => {
      try {
        const success = await refreshSession();
        if (success) {
          console.info('[QueryClientAuthIntegration] Session refreshed successfully');
        } else {
          console.warn('[QueryClientAuthIntegration] Session refresh failed, logging out');
          queryClient.clear();
          logout();
        }
      } catch (error) {
        console.warn('[QueryClientAuthIntegration] Session refresh error:', error);
        queryClient.clear();
        logout();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(refreshInterval);
  }, [isSignedIn, refreshSession, queryClient, logout]);

  return null; // This is a side-effect only component
}
