import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

/**
 * Global authenticated API hook
 * Provides a pre-configured authApi instance for making authenticated edge function calls
 * 
 * NOTE: No useMemo - we need fresh token references on every render.
 * React Query handles caching; stale closures cause "Missing Authorization header" errors.
 */
export function useAuthApi() {
  const { getSessionToken } = useBusinessAuth();
  
  // Create fresh on every render to avoid stale closure issues
  const getTokenAsync = async (_options?: { template?: string }): Promise<string | null> => {
    return getSessionToken();
  };
  
  return createAuthEdgeApi(getTokenAsync);
}
