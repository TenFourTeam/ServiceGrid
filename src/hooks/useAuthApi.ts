import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

/**
 * Global authenticated API hook
 * Provides a pre-configured authApi instance for making authenticated edge function calls
 * Eliminates the need to repeatedly set up Clerk token handling
 */
export function useAuthApi() {
  const { getToken } = useAuth();
  
  const authApi = useMemo(() => {
    return createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  }, [getToken]);
  
  return authApi;
}