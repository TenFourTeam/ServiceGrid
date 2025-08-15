import { useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/utils/edgeApi';
import { queryKeys } from '@/queries/keys';

/**
 * Centralized auth error recovery hook
 * Handles token refresh and query invalidation on auth errors
 */
export function useAuthErrorRecovery() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const handleAuthError = useCallback(async (error: unknown) => {
    if (!ApiError.isAuthError(error) || !isSignedIn) {
      return false;
    }

    console.warn('[useAuthErrorRecovery] Auth error detected, attempting recovery');
    
    try {
      // Force token refresh
      await getToken({ template: 'supabase', skipCache: true });
      
      // Invalidate business queries to trigger refetch with new token
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.business.current(),
        exact: false 
      });
      
      console.info('[useAuthErrorRecovery] Token refreshed and queries invalidated');
      return true;
    } catch (refreshError) {
      console.error('[useAuthErrorRecovery] Token refresh failed:', refreshError);
      
      // Clear cache to force re-authentication
      queryClient.clear();
      return false;
    }
  }, [getToken, isSignedIn, queryClient]);

  const retryWithAuthRecovery = useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = 1
  ) => {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Try auth recovery on first auth error
        if (attempt === 0 && ApiError.isAuthError(error)) {
          const recovered = await handleAuthError(error);
          if (recovered) {
            continue; // Retry the operation
          }
        }
        
        // Don't retry non-auth errors or if recovery failed
        break;
      }
    }
    
    throw lastError;
  }, [handleAuthError]);

  return {
    handleAuthError,
    retryWithAuthRecovery
  };
}