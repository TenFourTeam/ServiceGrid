import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface UserBusiness {
  id: string;
  name: string;
  logo_url?: string;
  role: 'owner' | 'worker';
  joined_at: string;
  is_current: boolean;
}

/**
 * Hook to fetch all businesses the current user is a member of
 */
export function useUserBusinesses() {
  const authApi = useAuthApi();

  return useQuery<UserBusiness[], Error>({
    queryKey: ['user-businesses'],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('user-businesses', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch user businesses');
      }
      
      // The API returns the businesses array directly
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
  });
}