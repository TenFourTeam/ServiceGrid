import { useAuth } from '@clerk/clerk-react';
import { useProfile } from '@/queries/useProfile';
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
 * Simple database-centric approach using profiles
 */
export function useBusinessContext() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { currentBusinessId, isInitializing } = useCurrentBusiness();
  
  // Use current business ID if set, otherwise use default business
  const profileQuery = useProfile(currentBusinessId);
  
  const business = profileQuery.data?.business as BusinessUI;
  const role = business?.role || 'owner';
  
  // Simplified error detection
  const hasError = profileQuery.isError;
  
  // Simple loading state
  const isLoadingBusiness = !isLoaded || isInitializing || (isSignedIn && profileQuery.isLoading);
  
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
    
    // Business data from database
    business,
    businessId: business?.id,
    businessName: business?.name,
    businessDescription: business?.description,
    businessPhone: business?.phone,
    businessReplyToEmail: business?.replyToEmail,
    businessTaxRateDefault: business?.taxRateDefault,
    businessLogoUrl: business?.logoUrl,
    businessLightLogoUrl: business?.lightLogoUrl,
    
    // Role and permissions from database
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