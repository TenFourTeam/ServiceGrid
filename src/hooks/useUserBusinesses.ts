import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useAuth } from '@/hooks/useBusinessAuth';

export interface UserBusiness {
  id: string;
  name: string;
  logo_url?: string;
  light_logo_url?: string;
  description?: string;
  phone?: string;
  reply_to_email?: string;
  tax_rate_default?: number;
  role: 'owner' | 'worker';
  joined_at: string;
  is_current: boolean;
}

/**
 * Hook to fetch all businesses the current user is a member of
 */
export function useUserBusinesses() {
  const { isSignedIn, isLoaded } = useAuth();
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
      
      // The API returns standardized { data, count } format
      return data?.data || [];
    },
    enabled: isLoaded && isSignedIn, // Prevent race condition - only fetch when authenticated
    staleTime: 30_000,
  });
}