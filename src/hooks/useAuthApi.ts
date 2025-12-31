import { useMemo } from 'react';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

/**
 * Global authenticated API hook
 * Provides a pre-configured authApi instance for making authenticated edge function calls
 */
export function useAuthApi() {
  const { getSessionToken } = useBusinessAuth();
  
  const authApi = useMemo(() => {
    // Create a wrapper that returns the session token as a Promise (for API compatibility)
    const getTokenAsync = async (_options?: { template?: string }): Promise<string | null> => {
      return getSessionToken();
    };
    return createAuthEdgeApi(getTokenAsync);
  }, [getSessionToken]);
  
  return authApi;
}
