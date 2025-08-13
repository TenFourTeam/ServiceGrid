import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthSnapshot, useAuthEvent } from "./AuthKernel";

/**
 * Integrates QueryClient with auth state changes
 * - Clears cache on sign out
 * - Refetches queries on auth changes
 * - Handles 401 errors globally
 */
export function QueryClientIntegration() {
  const queryClient = useQueryClient();
  const { snapshot } = useAuthSnapshot();

  // Clear cache on sign out
  useAuthEvent('auth:signed_out', () => {
    queryClient.clear();
  });

  // Refetch visible queries when auth state changes (token refresh, tenant switch)
  useAuthEvent('auth:phase_changed', ({ from, to }) => {
    if (from !== 'authenticated' && to === 'authenticated') {
      // Just became authenticated - refetch all visible queries
      queryClient.refetchQueries({ type: 'active' });
    }
  });

  // Invalidate all queries when claims version changes (tenant switch, role change)
  useEffect(() => {
    if (snapshot.claimsVersion > 1) {
      queryClient.invalidateQueries();
    }
  }, [snapshot.claimsVersion, queryClient]);

  return null; // This is a side-effect only component
}