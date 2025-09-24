import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useAuthApi } from '@/hooks/useAuthApi';

export function useUserBusinesses() {
  const { userId } = useAuth();
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['user-businesses', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('user-businesses', {
        method: 'GET',
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch user businesses');
      }
      
      return data?.businesses || [];
    },
    staleTime: 30_000,
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