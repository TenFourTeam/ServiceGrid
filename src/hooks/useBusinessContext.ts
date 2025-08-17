import { useAuth } from '@clerk/clerk-react';
import { useProfile } from '@/queries/useProfile';

export type BusinessUI = {
  id: string;
  name: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
  role?: 'owner' | 'worker';
  [key: string]: any;
};

/**
 * Single source of truth for business data access
 * Consolidates business context and data in one hook
 */
export function useBusinessContext() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  
  // Don't query profile until Clerk is fully loaded and user is authenticated
  const shouldFetchProfile = isLoaded && isSignedIn;
  const profileQuery = useProfile();
  
  const business = profileQuery.data?.business as BusinessUI;
  const role = business?.role || 'owner';
  
  // Simplified error detection
  const hasError = profileQuery.isError;
  
  // Coordinated loading state - don't show as loading if Clerk isn't ready
  const isLoadingBusiness = !isLoaded || (shouldFetchProfile && profileQuery.isLoading);
  
  return {
    // Authentication state
    isAuthenticated: isSignedIn,
    isLoaded,
    userId,
    
    // Complete business data (now sourced from profile query)
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
    
    // Loading states - coordinated between Clerk and profile query
    isLoadingBusiness,
    
    // Error states
    hasBusinessError: hasError,
    businessError: profileQuery.error,
    
    // Utilities
    refetchBusiness: profileQuery.refetch,
  };
}