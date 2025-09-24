import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface UserBusiness {
  id: string;
  name: string;
  role: 'owner' | 'worker';
  logo_url?: string;
  joined_at: string;
  is_current: boolean;
}

/**
 * Hook to fetch all businesses the current user is a member of
 */
export function useUserBusinesses() {
  const { userId, isSignedIn } = useAuth();
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['user-businesses', userId],
    queryFn: async () => {
      console.log('[useUserBusinesses] Fetching user businesses for user:', userId);
      
      const { data, error } = await authApi.invoke('user-businesses', {
        method: 'GET',
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch businesses');
      }
      
      return (data?.businesses || data || []) as UserBusiness[];
    },
    enabled: isSignedIn && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useCurrentDefaultBusiness() {
  const { userId } = useAuth();
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['user', 'default-business', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('get-profile', {
        method: 'GET',
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch default business');
      }
      
      return data?.profile?.defaultBusinessId || null;
    },
    staleTime: 10_000, // Short stale time to catch business switches quickly
    retry: 2,
  });
}