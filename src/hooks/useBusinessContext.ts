import { useAuth } from '@clerk/clerk-react';
import { useBusiness } from '@/queries/useBusiness';

/**
 * Single source of truth for business data access
 * Consolidates business context and data in one hook
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
    
    // Complete business data (replaces need for separate useBusiness calls)
    business,
    businessId: business?.id,
    businessName: business?.name,
    businessPhone: business?.phone,
    businessReplyToEmail: business?.replyToEmail,
    businessTaxRateDefault: business?.taxRateDefault,
    businessLogoUrl: business?.logoUrl,
    businessLightLogoUrl: business?.lightLogoUrl,
    
    // Role and permissions
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