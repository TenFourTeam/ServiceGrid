import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface AppUser {
  id: string;
  email: string;
  full_name?: string;
}

/**
 * Hook to fetch all users in the app for selection in invite modals
 */
export function useAllUsers(businessId?: string) {
  const authApi = useAuthApi();

  return useQuery<{ users: AppUser[] }, Error>({
    queryKey: ['all-users', businessId],
    queryFn: async () => {
      if (!businessId) {
        throw new Error('Business ID is required to fetch available users');
      }

      const { data, error } = await authApi.invoke('get-all-users', {
        method: 'GET',
        queryParams: { businessId }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch users');
      }
      
      return data || { users: [] };
    },
    staleTime: 60_000, // Cache for 1 minute
    enabled: !!businessId, // Only run query when businessId is available
  });
}