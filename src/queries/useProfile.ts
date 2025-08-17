import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

export function useProfile() {
  const { userId, getToken } = useAuth();
  const authApi = createAuthEdgeApi(getToken);

  return useQuery({
    queryKey: queryKeys.profile.current(),
    enabled: !!userId,
    queryFn: async () => {
      console.info('[useProfile] fetching profile via edge function');
      
      const { data, error } = await authApi.invoke('get-profile');
      
      if (error) {
        console.error('[useProfile] error:', error);
        throw new Error(error.message || 'Failed to fetch profile');
      }
      
      if (!data?.profile) {
        console.warn('[useProfile] profile not found');
        return null;
      }
      
      return {
        id: data.profile.id,
        fullName: data.profile.fullName,
        phoneE164: data.profile.phoneE164,
        defaultBusinessId: data.profile.defaultBusinessId
      };
    },
    staleTime: 30_000,
    retry: 2,
  });
}