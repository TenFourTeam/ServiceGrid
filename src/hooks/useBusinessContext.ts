import { useAuth } from '@clerk/clerk-react';
import { useBusiness } from '@/queries/useBusiness';

/**
 * Simplified business context hook
 * Replaces the complex useBusinessAuth with direct data access
 */
export function useBusinessContext() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const businessQuery = useBusiness();
  
  const business = businessQuery.data as any;
  const role = business?.role || 'worker';
  
  // Detect token expiration errors specifically
  const isTokenExpired = businessQuery.isError && 
    (businessQuery.error as any)?.status === 401 || 
    (businessQuery.error as any)?.status === 403;
  
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
    hasBusinessError: businessQuery.isError && !isTokenExpired,
    businessError: businessQuery.error,
    isTokenExpired,
    
    // Utilities
    refetchBusiness: businessQuery.refetch,
  };
}