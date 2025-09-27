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
  role: 'owner'; // Always owner in simplified model
  [key: string]: unknown;
};

/**
 * Simplified business context - single business per user (always owner)
 * Users can only access their own business or work in other businesses via invites
 */
export function useBusinessContext() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  
  console.log("🔍 [useBusinessContext] AUTH STATE:", {
    isSignedIn,
    isLoaded,
    userId
  });
  
  // Don't query profile until Clerk is fully loaded and user is authenticated
  const shouldFetchProfile = isLoaded && isSignedIn;
  const profileQuery = useProfile();
  
  console.log("🔍 [useBusinessContext] PROFILE QUERY:", {
    shouldFetchProfile,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    data: profileQuery.data,
    business: profileQuery.data?.business
  });
  
  const business = profileQuery.data?.business as BusinessUI;
  
  console.log("🔍 [useBusinessContext] BUSINESS EXTRACTED:", {
    business,
    businessId: business?.id,
    businessName: business?.name
  });
  
  // Simplified error detection
  const hasError = profileQuery.isError;
  
  // Coordinated loading state - don't show as loading if Clerk isn't ready
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
  
  const result = {
    // Authentication state
    isAuthenticated: isSignedIn,
    isLoaded,
    userId,
    
    // Single business data - user's owned business
    business,
    businessId: business?.id,
    businessName: business?.name,
    businessDescription: business?.description,
    businessPhone: business?.phone,
    businessReplyToEmail: business?.replyToEmail,
    businessTaxRateDefault: business?.taxRateDefault,
    businessLogoUrl: business?.logoUrl,
    businessLightLogoUrl: business?.lightLogoUrl,
    
    // Role and permissions - always owner of their business
    role: 'owner' as const,
    userRole: 'owner' as const,
    canManage: true, // Always true for owned business
    
    // Loading states
    isLoadingBusiness,
    
    // Error states
    hasBusinessError: hasError,
    businessError: profileQuery.error,
    
    // Utilities
    refetchBusiness: profileQuery.refetch,
  };

  console.log("🔍 [useBusinessContext] RETURNING:", result);

  return result;
}