import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface PrimaryBusiness {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
  logoUrl?: string;
  lightLogoUrl?: string;
  role: 'owner'; // Always owner for primary business
}

/**
 * Hook to fetch the user's primary business (the one they own)
 * This is always owner role and comes from their profile
 */
export function usePrimaryBusiness() {
  const { isSignedIn, isLoaded } = useAuth();
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['primary-business'],
    enabled: isLoaded && isSignedIn,
    queryFn: async () => {
      console.info('[usePrimaryBusiness] fetching primary business via get-profile');
      
      const { data, error } = await authApi.invoke('get-profile', {
        method: 'GET',
      });
      
      if (error) {
        console.error('[usePrimaryBusiness] error:', error);
        throw new Error(error.message || 'Failed to fetch primary business');
      }
      
      if (!data?.business) {
        console.warn('[usePrimaryBusiness] no primary business found');
        return null;
      }
      
      // Only return if it's an owned business (role should be owner)
      if (data.business.role !== 'owner') {
        console.warn('[usePrimaryBusiness] business role is not owner, skipping');
        return null;
      }
      
      return data.business as PrimaryBusiness;
    },
    staleTime: 30_000,
    retry: 2,
  });
}