import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useBusinessAuth } from "@/hooks/useBusinessAuth";
import { useLifecycleEmailTriggers } from "@/hooks/useLifecycleEmailTriggers";

/**
 * Integrates QueryClient with auth state changes
 * - Clears cache on sign out
 * - Refetches queries on auth changes
 * - Handles token expiration recovery
 */
export function QueryClientAuthIntegration() {
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const { refreshSession } = useBusinessAuth();
  const previousSignedInRef = useRef<boolean | null>(null);
  
  // Lifecycle email triggers - only activate when auth is ready and user is signed in
  useLifecycleEmailTriggers(isLoaded && isSignedIn);

  // Clear cache on sign out and handle auth changes
  useEffect(() => {
    if (!isLoaded) return;
    
    const wasSignedIn = previousSignedInRef.current;
    previousSignedInRef.current = isSignedIn;

    if (!isSignedIn && wasSignedIn) {
      // User signed out - clear all cached data
      queryClient.clear();
    }
    // Note: We don't refetch on sign-in anymore - queries will naturally
    // start fetching once their enabled conditions are met
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
          console.warn('[QueryClientAuthIntegration] Session refresh failed, clearing cache');
          queryClient.clear();
        }
      } catch (error) {
        console.warn('[QueryClientAuthIntegration] Session refresh error:', error);
        queryClient.clear();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(refreshInterval);
  }, [isSignedIn, refreshSession, queryClient]);

  return null; // This is a side-effect only component
}
