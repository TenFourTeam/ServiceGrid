import { useAuthSnapshot } from '@/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Hook for business context management (single business per user model)
 */
export function useBusinessContext() {
  const { snapshot, refreshAuth } = useAuthSnapshot();
  const queryClient = useQueryClient();

  // Simplified for single business model - no switching needed
  const refreshBusiness = useCallback(async () => {
    // Clear all cached queries and refresh auth
    queryClient.clear();
    await refreshAuth();
  }, [queryClient, refreshAuth]);

  const getCurrentBusiness = useCallback(() => {
    return {
      id: snapshot.businessId,
      name: snapshot.businessName,
      isLoaded: snapshot.phase === 'authenticated' && !!snapshot.businessId,
    };
  }, [snapshot]);

  return {
    currentBusiness: getCurrentBusiness(),
    refreshBusiness,
    isAuthenticated: snapshot.phase === 'authenticated',
  };
}