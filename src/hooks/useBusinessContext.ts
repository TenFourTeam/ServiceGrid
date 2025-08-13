import { useAuthSnapshot } from '@/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Hook for business context management and switching
 */
export function useBusinessContext() {
  const { snapshot, refreshAuth } = useAuthSnapshot();
  const queryClient = useQueryClient();

  const switchBusiness = useCallback(async (businessId: string) => {
    // For future multi-business support
    // This would trigger a business context switch in the auth system
    
    // Clear all cached queries when switching business
    queryClient.clear();
    
    // Refresh auth with new business context
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
    switchBusiness,
    isAuthenticated: snapshot.phase === 'authenticated',
  };
}