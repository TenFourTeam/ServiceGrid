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
  
  // Lifecycle email triggers temporarily disabled - was causing email spam and mobile crashes
  // useLifecycleEmailTriggers(true);

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

  // Simplified token handling - rely on Clerk's built-in recovery
  useEffect(() => {
    if (!isSignedIn) return;

    // Set up lightweight token validation (every 10 minutes)
    const tokenCheckInterval = setInterval(async () => {
      try {
        await getToken({ template: 'supabase', skipCache: true });
        console.info('[QueryClientClerkIntegration] Token refreshed successfully');
      } catch (error) {
        console.warn('[QueryClientClerkIntegration] Token refresh failed, clearing cache');
        queryClient.clear();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(tokenCheckInterval);
  }, [isSignedIn, getToken, queryClient]);

  return null; // This is a side-effect only component
}