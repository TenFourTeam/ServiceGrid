import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

/**
 * Integrates QueryClient with Clerk auth state changes
 * - Clears cache on sign out
 * - Refetches queries on auth changes
 */
export function QueryClientClerkIntegration() {
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const previousSignedInRef = useRef<boolean | null>(null);

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

  return null; // This is a side-effect only component
}