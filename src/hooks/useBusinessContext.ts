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
  
  // Query user's role for the specific business
  const roleQuery = useQuery({
    queryKey: ['user-business-role', businessIdToQuery, userId],
    queryFn: async () => {
      if (!businessIdToQuery || !authApi) return null;
      
      try {
        // If querying user's own business, they're the owner
        if (businessIdToQuery === userOwnedBusiness?.id) {
          return 'owner' as const;
        }
        
        // For other businesses, check business_permissions via supabase query
        const { data, error } = await authApi.invoke('user-businesses', {
          method: 'GET'
        });
        
        if (error) {
          console.error('[useBusinessContext] Role query error:', error);
          return null;
        }
        
        // Check if user has permissions for this business
        const hasPermission = data?.businesses?.some((b: any) => b.id === businessIdToQuery);
        return hasPermission ? 'worker' as const : null;
      } catch (err) {
        console.error('[useBusinessContext] Role query failed:', err);
        return null;
      }
    },
    enabled: shouldFetch && !!businessIdToQuery,
    staleTime: 30_000,
  });
  
  // For now, use the user's owned business data
  const business = userOwnedBusiness;
  const role = roleQuery.data;
  
  // Coordinated loading state
  const isLoadingBusiness = !isLoaded || (shouldFetch && (profileQuery.isLoading || roleQuery.isLoading));
  const hasError = profileQuery.isError || roleQuery.isError;
  
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
    businessId: business?.id,
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
    businessError: profileQuery.error || roleQuery.error,
    
    // Utilities
    refetchBusiness: () => {
      profileQuery.refetch();
      roleQuery.refetch();
    },
  };
}