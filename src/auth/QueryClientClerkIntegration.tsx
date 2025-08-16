import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { queryKeys } from "@/queries/keys";
import { useLifecycleEmailTriggers } from "@/hooks/useLifecycleEmailTriggers";

/**
 * Integrates QueryClient with Clerk auth state changes
 * - Clears cache on sign out
 * - Refetches queries on auth changes
 * - Handles token expiration recovery
 */
export function QueryClientClerkIntegration() {
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const previousSignedInRef = useRef<boolean | null>(null);
  
  // Initialize lifecycle email triggers
  useLifecycleEmailTriggers();

  // Clear cache on sign out and handle auth changes
  useEffect(() => {
    if (!isLoaded) return;
    
    const wasSignedIn = previousSignedInRef.current;
    previousSignedInRef.current = isSignedIn;

    if (!isSignedIn && wasSignedIn) {
      // User signed out - clear all cached data
      queryClient.clear();
    }

    // Refetch visible queries when becoming authenticated
    if (!wasSignedIn && isSignedIn) {
      queryClient.refetchQueries({ type: 'active' });
    }
  }, [isLoaded, isSignedIn, queryClient]);

  // Listen for token expiration and handle automatic recovery
  useEffect(() => {
    if (!isSignedIn) return;

    const handleTokenExpiration = async () => {
      try {
        // Force token refresh
        await getToken({ skipCache: true });
        console.info('[QueryClientClerkIntegration] token refreshed, invalidating business queries');
        
        // Invalidate business queries to trigger refetch with new token
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.business.current()
        });
      } catch (error) {
        console.error('[QueryClientClerkIntegration] token refresh failed:', error);
        // Clear cache on token refresh failure to force re-authentication
        queryClient.clear();
      }
    };

    // Set up periodic token validation (every 5 minutes)
    const tokenCheckInterval = setInterval(async () => {
      try {
        await getToken(); // This will refresh if needed
      } catch (error) {
        console.warn('[QueryClientClerkIntegration] token validation failed, triggering recovery');
        handleTokenExpiration();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(tokenCheckInterval);
  }, [isSignedIn, getToken, queryClient]);

  return null; // This is a side-effect only component
}