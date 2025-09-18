import { useAuth } from '@clerk/clerk-react';
import { useProfile } from '@/queries/useProfile';
import { useParams, useLocation } from 'react-router-dom';
import { useCurrentBusiness } from '@/contexts/CurrentBusinessContext';
import { useEffect } from 'react';
import { updateBusinessMeta } from '@/utils/metaUpdater';
import { hasCacheBuster } from '@/utils/shareUtils';

export type BusinessUI = {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
  slug?: string;
  role?: 'owner' | 'worker';
  [key: string]: any;
};

/**
 * Single source of truth for business data access
 * Consolidates business context and data in one hook
 */
export function useBusinessContext() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const params = useParams();
  const location = useLocation();
  const { currentBusinessId } = useCurrentBusiness();
  
  // Don't query profile until Clerk is fully loaded and user is authenticated
  const shouldFetchProfile = isLoaded && isSignedIn;
  // Use current business ID if set, otherwise use default business
  const profileQuery = useProfile(currentBusinessId);
  
  const business = profileQuery.data?.business as BusinessUI;
  const role = business?.role || 'owner';
  
  // Simplified error detection
  const hasError = profileQuery.isError;
  
  // Coordinated loading state - don't show as loading if Clerk isn't ready
  const isLoadingBusiness = !isLoaded || (shouldFetchProfile && profileQuery.isLoading);
  
  // Update meta tags when business data changes (enhanced for cache busting)
  useEffect(() => {
    if (business?.name) {
      updateBusinessMeta({
        name: business.name,
        description: business.description,
        logoUrl: business.logoUrl || business.lightLogoUrl
      });
    }
  }, [business?.name, business?.description, business?.logoUrl, business?.lightLogoUrl, hasCacheBuster()]);
  
  return {
    // Authentication state
    isAuthenticated: isSignedIn,
    isLoaded,
    userId,
    
    // Complete business data (now sourced from profile query)
    business,
    businessId: business?.id,
    businessName: business?.name,
    businessDescription: business?.description,
    businessPhone: business?.phone,
    businessReplyToEmail: business?.replyToEmail,
    businessTaxRateDefault: business?.taxRateDefault,
    businessSlug: business?.slug,
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