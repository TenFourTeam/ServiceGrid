import { useAuth } from '@clerk/clerk-react';
import { useProfile } from '@/queries/useProfile';
import { useEffect } from 'react';
import { updateBusinessMeta } from '@/utils/metaUpdater';

export type BusinessUI = {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
  role?: 'owner' | 'worker';
  [key: string]: unknown;
};

/**
 * Single source of truth for business data access
 * Simple single-tenant business model
 */
export function useBusinessContext() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  
  // Don't query profile until Clerk is fully loaded and user is authenticated
  const shouldFetchProfile = isLoaded && isSignedIn;
  
  // Backend will automatically resolve user's business
  const profileQuery = useProfile();
  
  const business = profileQuery.data?.business as BusinessUI;
  
  // Simple business data - no organization merging needed
  const role = business?.role || 'owner';
  
  // Simplified error detection
  const hasError = profileQuery.isError;
  
  // Simple loading state
  const isLoadingBusiness = !isLoaded || (shouldFetchProfile && profileQuery.isLoading);
  
  // Update meta tags when business data changes
  useEffect(() => {
    if (business?.name) {
      updateBusinessMeta({
        name: business.name,
        description: business.description,
        logoUrl: (business.logoUrl || business.lightLogoUrl) as string
      });
    }
  }, [business?.name, business?.description, business?.logoUrl, business?.lightLogoUrl]);
  
  return {
    // Authentication state
    isAuthenticated: isSignedIn,
    isLoaded,
    userId,
    
    // Business data from backend
    business,
    businessId: business?.id,
    businessName: business?.name,
    businessDescription: business?.description,
    businessPhone: business?.phone,
    businessReplyToEmail: business?.replyToEmail,
    businessTaxRateDefault: business?.taxRateDefault,
    businessLogoUrl: business?.logoUrl,
    businessLightLogoUrl: business?.lightLogoUrl,
    
    // Role and permissions
    role,
    userRole: role,
    canManage: role === 'owner',
    
    // Loading states
    isLoadingBusiness,
    
    // Error states
    hasBusinessError: hasError,
    businessError: profileQuery.error,
    
    // Utilities
    refetchBusiness: profileQuery.refetch,
  };
}