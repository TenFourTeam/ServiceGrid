import { useAuth, useOrganization } from '@clerk/clerk-react';
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
 * Consolidates Clerk organization context and backend business data
 */
export function useBusinessContext() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { organization, isLoaded: isOrgLoaded, membership } = useOrganization();
  
  // Use organization ID as business ID for backend queries
  const businessId = organization?.id || null;
  
  // Don't query profile until Clerk is fully loaded and user is authenticated
  const shouldFetchProfile = isLoaded && isSignedIn && isOrgLoaded;
  
  // Use organization ID to fetch business data from backend
  const profileQuery = useProfile(businessId);
  
  const business = profileQuery.data?.business as BusinessUI;
  
  // Merge organization data with backend business data
  const mergedBusiness: BusinessUI | undefined = business ? {
    ...business,
    // Override with organization data where available
    id: organization?.id || business.id,
    name: organization?.name || business.name,
    // Map membership role to business role
    role: membership?.role === 'org:admin' ? 'owner' : 'worker'
  } : organization ? {
    // If no backend business data, use organization data
    id: organization.id,
    name: organization.name,
    role: membership?.role === 'org:admin' ? 'owner' : 'worker'
  } : undefined;
  
  const role = mergedBusiness?.role || 'owner';
  
  // Simplified error detection
  const hasError = profileQuery.isError;
  
  // Coordinated loading state
  const isLoadingBusiness = !isLoaded || !isOrgLoaded || (shouldFetchProfile && profileQuery.isLoading);
  
  // Update meta tags when business data changes
  useEffect(() => {
    if (mergedBusiness?.name) {
      updateBusinessMeta({
        name: mergedBusiness.name,
        description: mergedBusiness.description,
        logoUrl: (mergedBusiness.logoUrl || mergedBusiness.lightLogoUrl) as string
      });
    }
  }, [mergedBusiness?.name, mergedBusiness?.description, mergedBusiness?.logoUrl, mergedBusiness?.lightLogoUrl]);
  
  return {
    // Authentication state
    isAuthenticated: isSignedIn,
    isLoaded,
    userId,
    
    // Organization data
    organization,
    membership,
    
    // Complete business data (merged from organization and backend)
    business: mergedBusiness,
    businessId: mergedBusiness?.id,
    businessName: mergedBusiness?.name,
    businessDescription: mergedBusiness?.description,
    businessPhone: mergedBusiness?.phone,
    businessReplyToEmail: mergedBusiness?.replyToEmail,
    businessTaxRateDefault: mergedBusiness?.taxRateDefault,
    businessLogoUrl: mergedBusiness?.logoUrl,
    businessLightLogoUrl: mergedBusiness?.lightLogoUrl,
    
    // Role and permissions
    role,
    userRole: role,
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