import { useAuth } from '@clerk/clerk-react';
import { useBusiness } from '@/queries/useBusiness';

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
  
  // Don't query business until Clerk is fully loaded and user is authenticated
  const shouldFetchBusiness = isLoaded && isSignedIn;
  const businessQuery = useBusiness(shouldFetchBusiness);
  
  const business = businessQuery.data as BusinessUI;
  const role = business?.role || 'worker';
  
  // Simplified error detection
  const hasError = businessQuery.isError;
  
  // Coordinated loading state - don't show as loading if Clerk isn't ready
  const isLoadingBusiness = !isLoaded || (shouldFetchBusiness && businessQuery.isLoading);
  
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
    
    // Loading states - coordinated between Clerk and business query
    isLoadingBusiness,
    
    // Error states
    hasBusinessError: hasError,
    businessError: businessQuery.error,
    
    // Utilities
    refetchBusiness: businessQuery.refetch,
  };
}