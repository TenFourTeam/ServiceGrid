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
 * Consolidates business context and data in one hook
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
  
  // Check if current business uses Clerk organizations
  const usesClerkOrgs = business?.uses_clerk_orgs === true;
  
  // Simplified error detection
  const hasError = profileQuery.isError;
  
  // Get initialization state from context
  const { isInitializing } = useCurrentBusiness();
  
  // Coordinated loading state - consider Clerk org loading for businesses using Clerk
  const clerkOrgLoading = usesClerkOrgs && !orgLoaded;
  const isLoadingBusiness = !isLoaded || isInitializing || clerkOrgLoading || (shouldFetchProfile && profileQuery.isLoading);
  
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
    
    // Complete business data (overlay: use Clerk org data if available and business uses Clerk)
    business: usesClerkOrgs && organization ? {
      ...business,
      name: organization.name,
      id: business?.id, // Keep database ID
      clerk_org_id: organization.id, // Add Clerk org ID
    } : business,
    businessId: business?.id,
    businessName: usesClerkOrgs && organization ? organization.name : business?.name,
    businessDescription: business?.description,
    businessPhone: business?.phone,
    businessReplyToEmail: business?.replyToEmail,
    businessTaxRateDefault: business?.taxRateDefault,
    businessLogoUrl: usesClerkOrgs && organization ? organization.imageUrl : business?.logoUrl,
    businessLightLogoUrl: business?.lightLogoUrl,
    
    // Role and permissions (overlay: use Clerk org role if available)
    role: usesClerkOrgs && organization && membership ? 
      (membership.role === 'org:admin' ? 'owner' : 'worker') : role,
    userRole: usesClerkOrgs && organization && membership ? 
      (membership.role === 'org:admin' ? 'owner' : 'worker') : role,
    canManage: usesClerkOrgs && organization && membership ? 
      membership.role === 'org:admin' : role === 'owner',
    
    // Loading states - coordinated between Clerk and profile query
    isLoadingBusiness,
    
    // Error states
    hasBusinessError: hasError,
    businessError: profileQuery.error,
    
    // Clerk organization overlay data
    usesClerkOrgs,
    clerkOrganization: organization,
    
    // Utilities
    refetchBusiness: profileQuery.refetch,
  };
}