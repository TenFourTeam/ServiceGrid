import { useAuth, useBusinessAuth } from '@/hooks/useBusinessAuth';
import { useUserBusinesses } from '@/hooks/useUserBusinesses';
import { useEffect } from 'react';
import { updateBusinessMeta } from '@/utils/metaUpdater';

export type BusinessUI = {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
  role: 'owner' | 'worker';
  createdAt?: string;
  logoUrl?: string;
  lightLogoUrl?: string;
  [key: string]: unknown;
};

/**
 * Role-aware business context - dynamically determines user's role for the current business
 * Uses the existing business_permissions system to detect owner vs worker roles
 */
export function useBusinessContext(targetBusinessId?: string) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { profile } = useBusinessAuth();
  
  // Get all businesses the user has access to (owned + worker)
  const businessesQuery = useUserBusinesses();
  
  // Early return if auth is not ready - prevents race condition
  if (!isLoaded) {
    return {
      isAuthenticated: false,
      isLoaded: false,
      userId: null,
      profileId: null,
      business: null,
      businessId: undefined,
      businessName: undefined,
      businessDescription: undefined,
      businessPhone: undefined,
      businessReplyToEmail: undefined,
      businessTaxRateDefault: undefined,
      businessLogoUrl: undefined,
      businessLightLogoUrl: undefined,
      role: null,
      userRole: null,
      canManage: false,
      isLoadingBusiness: true,
      hasBusinessError: false,
      businessError: null,
      refetchBusiness: () => Promise.resolve({ data: undefined, error: null }),
    };
  }
  
  // Transform UserBusiness to BusinessUI format
  const transformedBusinesses: BusinessUI[] | undefined = businessesQuery.data?.map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
    phone: b.phone,
    replyToEmail: b.reply_to_email,
    taxRateDefault: b.tax_rate_default,
    role: b.role,
    logoUrl: b.logo_url,
    lightLogoUrl: b.light_logo_url,
    createdAt: b.joined_at,
  }));
  
  // Find the owned business (user's default business)
  const ownedBusiness = transformedBusinesses?.find(b => b.role === 'owner');
  
  // Determine which business to use
  const targetBusiness = targetBusinessId 
    ? transformedBusinesses?.find(b => b.id === targetBusinessId)
    : ownedBusiness;
  
  // Get the business and role
  const business = targetBusiness;
  const role = targetBusiness?.role || null;
  
  // Use targetBusinessId immediately if provided to prevent race condition
  const businessId = targetBusinessId || business?.id;
  
  // Simplified loading and error states
  const isLoadingBusiness = !isLoaded || businessesQuery.isLoading;
  const hasError = businessesQuery.isError;
  
  // Update meta tags when business data changes
  useEffect(() => {
    if (business?.name) {
      updateBusinessMeta({
        name: business.name,
        description: business.description,
        logoUrl: business.logoUrl as string
      });
    }
  }, [business?.name, business?.description, business?.logoUrl]);
  
  return {
    // Authentication state
    isAuthenticated: isSignedIn,
    isLoaded,
    userId, // Profile UUID for database operations
    profileId: profile?.id, // Profile UUID for database operations
    
    // Business data (currently using user's owned business)
    business,
    businessId: businessId,
    businessName: business?.name,
    businessDescription: business?.description,
    businessPhone: business?.phone,
    businessReplyToEmail: business?.replyToEmail,
    businessTaxRateDefault: business?.taxRateDefault,
    businessLogoUrl: business?.logoUrl,
    businessLightLogoUrl: business?.lightLogoUrl,
    
    // Dynamic role and permissions
    role: role, // Can be 'owner', 'worker', or null
    userRole: role,
    canManage: role === 'owner', // Only owners can manage
    
    // Loading states
    isLoadingBusiness,
    
    // Error states
    hasBusinessError: hasError,
    businessError: businessesQuery.error,
    
    // Utilities
    refetchBusiness: () => businessesQuery.refetch(),
  };
}
