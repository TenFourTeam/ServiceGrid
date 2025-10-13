import { useAuth } from '@clerk/clerk-react';
import { useProfile } from '@/queries/useProfile';
import { useEffect } from 'react';
import { updateBusinessMeta } from '@/utils/metaUpdater';
import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

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
  const authApi = useAuthApi();
  
  // Don't query until Clerk is fully loaded and user is authenticated
  const shouldFetch = isLoaded && isSignedIn;
  
  // Get user's profile to determine their default business
  const profileQuery = useProfile();
  const userOwnedBusiness = profileQuery.data?.business;
  
  // Use target business ID if provided, otherwise fall back to user's own business
  const businessIdToQuery = targetBusinessId || userOwnedBusiness?.id;
  
  // Query user's role ONLY when accessing a different business
  const roleQuery = useQuery({
    queryKey: ['user-business-role', businessIdToQuery, userId],
    queryFn: async () => {
      if (!businessIdToQuery || !authApi) return 'owner' as const;
      
      try {
        // For other businesses, check business_permissions via supabase query
        const { data, error } = await authApi.invoke('user-businesses', {
          method: 'GET'
        });
        
        if (error) {
          console.error('[useBusinessContext] Role query error:', error);
          return 'owner' as const;
        }
        
        // Check if user has permissions for this business
        const hasPermission = data?.data?.some((b: any) => b.id === businessIdToQuery);
        return hasPermission ? 'worker' as const : 'owner' as const;
      } catch (err) {
        console.error('[useBusinessContext] Role query failed:', err);
        return 'owner' as const;
      }
    },
    enabled: shouldFetch && !!targetBusinessId, // ONLY query when targetBusinessId exists
    staleTime: 30_000,
    initialData: targetBusinessId ? undefined : ('owner' as const), // Default to owner for own business
  });

  // Query target business data when accessing a different business
  const targetBusinessQuery = useQuery({
    queryKey: ['target-business', targetBusinessId],
    queryFn: async () => {
      if (!targetBusinessId || !authApi) return null;
      
      try {
        const { data, error } = await authApi.invoke('user-businesses', {
          method: 'GET'
        });
        
        if (error) {
          console.error('[useBusinessContext] Target business query error:', error);
          return null;
        }
        
        // Find the target business in the user's accessible businesses
        const targetBusiness = data?.data?.find((b: any) => b.id === targetBusinessId);
        return targetBusiness || null;
      } catch (err) {
        console.error('[useBusinessContext] Target business query failed:', err);
        return null;
      }
    },
    enabled: shouldFetch && !!targetBusinessId && targetBusinessId !== userOwnedBusiness?.id,
    staleTime: 30_000,
  });
  
  // Determine which business data to use
  const business = targetBusinessId && targetBusinessId !== userOwnedBusiness?.id 
    ? targetBusinessQuery.data 
    : userOwnedBusiness;
  // Role is 'owner' by default (for own business), or queried (for other businesses)
  const role = targetBusinessId ? roleQuery.data : ('owner' as const);
  
  // CRITICAL: Use targetBusinessId immediately if provided to prevent race condition
  // This ensures API calls get the correct businessId before the query resolves
  const businessId = targetBusinessId || business?.id;
  
  // Coordinated loading state
  const isLoadingBusiness = !isLoaded || (shouldFetch && (
    profileQuery.isLoading || 
    (targetBusinessId && roleQuery.isLoading) || 
    (targetBusinessQuery.isLoading && targetBusinessId && targetBusinessId !== userOwnedBusiness?.id)
  ));
  const hasError = profileQuery.isError || roleQuery.isError || targetBusinessQuery.isError;
  
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
    role: role, // Always 'owner' or 'worker', never null
    userRole: role,
    canManage: role === 'owner', // Only owners can manage
    
    // Loading states
    isLoadingBusiness,
    
    // Error states
    hasBusinessError: hasError,
    businessError: profileQuery.error || roleQuery.error || targetBusinessQuery.error,
    
    // Utilities
    refetchBusiness: () => {
      profileQuery.refetch();
      roleQuery.refetch();
      targetBusinessQuery.refetch();
    },
  };
}