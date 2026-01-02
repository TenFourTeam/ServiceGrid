import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLifecycleEmailTriggers } from "@/hooks/useLifecycleEmailTriggers";

/**
 * Integrates QueryClient with Supabase auth state changes
 * - Clears cache on sign out
 * - Refetches queries on auth changes
 */
export function QueryClientIntegration() {
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const previousSignedInRef = useRef<boolean | null>(null);
  
  // Lifecycle email triggers with proper deduplication
  useLifecycleEmailTriggers(true);

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
