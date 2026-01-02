import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

/**
 * Global authenticated API hook
 * Provides a pre-configured authApi instance for making authenticated edge function calls
 * Eliminates the need to repeatedly set up token handling
 */
export function useAuthApi() {
  const { getToken } = useAuth();
  
  const authApi = useMemo(() => {
    return createAuthEdgeApi(getToken);
  }, [getToken]);
  
  return authApi;
}
