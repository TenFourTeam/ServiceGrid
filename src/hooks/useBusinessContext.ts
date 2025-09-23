import { useAuth, useOrganization, useUser } from '@clerk/clerk-react';
import { useProfile } from '@/queries/useProfile';
import { useParams, useLocation } from 'react-router-dom';
import { useCurrentBusiness } from '@/contexts/CurrentBusinessContext';
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
 * Always uses Clerk organizations - simplified authentication flow
 */
export function useBusinessContext() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { organization, isLoaded: orgLoaded, membership } = useOrganization();
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
  
  // Get initialization state from context
  const { isInitializing } = useCurrentBusiness();
  
  // Coordinated loading state - always consider Clerk org loading
  const isLoadingBusiness = !isLoaded || isInitializing || !orgLoaded || (shouldFetchProfile && profileQuery.isLoading);
  
  // Update meta tags when business data changes
  useEffect(() => {
    const businessName = organization?.name || business?.name;
    if (businessName) {
      updateBusinessMeta({
        name: businessName,
        description: business?.description,
        logoUrl: organization?.imageUrl || (business.logoUrl || business.lightLogoUrl) as string
      });
    }
  }, [organization?.name, business?.name, business?.description, business?.logoUrl, business?.lightLogoUrl, organization?.imageUrl]);
  
  return {
    // Authentication state
    isAuthenticated: isSignedIn,
    isLoaded,
    userId,
    
    // Complete business data - always overlay with Clerk organization data
    business: organization ? {
      ...business,
      name: organization.name,
      id: business?.id, // Keep database ID
      clerk_org_id: organization.id, // Add Clerk org ID
    } : business,
    businessId: business?.id,
    businessName: organization?.name || business?.name,
    businessDescription: business?.description,
    businessPhone: business?.phone,
    businessReplyToEmail: business?.replyToEmail,
    businessTaxRateDefault: business?.taxRateDefault,
    businessLogoUrl: organization?.imageUrl || business?.logoUrl,
    businessLightLogoUrl: business?.lightLogoUrl,
    
    // Role and permissions - always use Clerk organization role
    role: organization && membership ? 
      (membership.role === 'org:admin' ? 'owner' : 'worker') : role,
    userRole: organization && membership ? 
      (membership.role === 'org:admin' ? 'owner' : 'worker') : role,
    canManage: organization && membership ? 
      membership.role === 'org:admin' : role === 'owner',
    
    // Loading states - coordinated between Clerk and profile query
    isLoadingBusiness,
    
    // Error states
    hasBusinessError: hasError,
    businessError: profileQuery.error,
    
    // Clerk organization data
    clerkOrganization: organization,
    
    // Utilities
    refetchBusiness: profileQuery.refetch,
  };
}