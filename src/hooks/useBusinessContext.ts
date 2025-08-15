import { useAuth } from '@clerk/clerk-react';
import { useBusiness } from '@/queries/useBusiness';

/**
 * Simplified business context hook
 * Replaces the complex useBusinessAuth with direct data access
 */
export function useBusinessContext() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const businessQuery = useBusiness();
  
  const business = businessQuery.data;
  const role = business?.role || 'worker';
  
  return {
    // Authentication state
    isAuthenticated: isSignedIn,
    isLoaded,
    userId,
    
    // Business context
    business,
    businessId: business?.id,
    role,
    canManage: role === 'owner',
    
    // Loading states
    isLoadingBusiness: businessQuery.isLoading,
    
    // Error states
    hasBusinessError: businessQuery.isError,
    businessError: businessQuery.error,
    
    // Utilities
    refetchBusiness: businessQuery.refetch,
  };
}