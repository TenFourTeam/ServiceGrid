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
  const { isSignedIn } = useAuth();
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['user-businesses'],
    queryFn: async () => {
      console.log('[useUserBusinesses] Fetching user businesses');
      
      const { data, error } = await authApi.invoke('user-businesses', {
        method: 'GET',
      });
      
      if (error) {
        throw new Error((error as any)?.message || 'Failed to fetch businesses');
      }
      
      return data as UserBusiness[];
    },
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}