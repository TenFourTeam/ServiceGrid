import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthSnapshot } from "./AuthKernel";

/**
 * Integrates QueryClient with auth state changes
 * - Clears cache on sign out
 * - Refetches queries on auth changes
 * - Handles 401 errors globally
 */
export function QueryClientIntegration() {
  const queryClient = useQueryClient();
  const { snapshot } = useAuthSnapshot();
  const previousPhaseRef = useRef(snapshot.phase);

  // Clear cache on sign out and handle phase changes
  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = snapshot.phase;

    if (snapshot.phase === 'signed_out') {
      queryClient.clear();
    }

    // Refetch visible queries when becoming authenticated
    if (previousPhase !== 'authenticated' && snapshot.phase === 'authenticated') {
      queryClient.refetchQueries({ type: 'active' });
    }
  }, [snapshot.phase, queryClient]);

  // Invalidate all queries when claims version changes (tenant switch, role change)
  useEffect(() => {
    if (snapshot.claimsVersion > 1) {
      queryClient.invalidateQueries();
    }
  }, [snapshot.claimsVersion, queryClient]);

  return null; // This is a side-effect only component
}