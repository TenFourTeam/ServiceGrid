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
  
  // Transform UserBusiness to BusinessUI format with deduplication
  // Owner role takes precedence over worker role if duplicates exist
  const transformedBusinesses: BusinessUI[] | undefined = (() => {
    if (!businessesQuery.data) return undefined;
    
    const seen = new Map<string, BusinessUI>();
    for (const b of businessesQuery.data) {
      const existing = seen.get(b.id);
      // Keep owner role over worker role if duplicate
      if (!existing || b.role === 'owner') {
        seen.set(b.id, {
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
        });
      }
    }
    return Array.from(seen.values());
  })();
  
  // Deterministic business selection with worker-safe fallback
  // Priority: targetBusinessId > is_current > first owner > first business
  const resolvedBusiness = (() => {
    if (!transformedBusinesses?.length) return undefined;
    
    // 1. If targetBusinessId provided, use that
    if (targetBusinessId) {
      return transformedBusinesses.find(b => b.id === targetBusinessId);
    }
    
    // 2. Find is_current business (set by backend based on default_business_id)
    const currentBusiness = businessesQuery.data?.find(b => b.is_current);
    if (currentBusiness) {
      return transformedBusinesses.find(b => b.id === currentBusiness.id);
    }
    
    // 3. Fallback to first owner business
    const ownerBusiness = transformedBusinesses.find(b => b.role === 'owner');
    if (ownerBusiness) return ownerBusiness;
    
    // 4. Final fallback: first business in list (for worker-only users)
    return transformedBusinesses[0];
  })();
  
  const business = resolvedBusiness;
  const role = resolvedBusiness?.role || null;
  const businessId = resolvedBusiness?.id;
  
  // Simplified loading and error states
  const isLoadingBusiness = !isLoaded || businessesQuery.isLoading;
  const hasError = businessesQuery.isError;
  
  // Update meta tags when business data changes - MUST be called unconditionally
  useEffect(() => {
    if (business?.name) {
      updateBusinessMeta({
        name: business.name,
        description: business.description,
        logoUrl: business.logoUrl as string
      });
    }
  }, [business?.name, business?.description, business?.logoUrl]);
  
  // Early return if auth is not ready - AFTER all hooks are called
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
