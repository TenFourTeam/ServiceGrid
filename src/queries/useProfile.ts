import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { useAuth } from '@clerk/clerk-react';
import { useAuthApi } from '@/hooks/useAuthApi';

export function useProfile(currentBusinessId?: string | null) {
  const { userId } = useAuth();
  const authApi = useAuthApi();

  return useQuery({
    queryKey: queryKeys.profile.byId(userId || '', currentBusinessId || ''),
    enabled: !!userId,
    queryFn: async () => {
      console.info('[useProfile] fetching profile via edge function', { currentBusinessId });
      
      const url = currentBusinessId ? `get-profile?businessId=${currentBusinessId}` : 'get-profile';
      const { data, error } = await authApi.invoke(url, {
        method: 'GET',
      });
      
      if (error) {
        console.error('[useProfile] error:', error);
        throw new Error((error as any)?.message || 'Failed to fetch profile');
      }
      
      if (!(data as any)?.profile) {
        console.warn('[useProfile] profile not found');
        return null;
      }
      
      return {
        profile: {
          id: (data as any)?.profile?.id,
          fullName: (data as any)?.profile?.fullName,
          phoneE164: (data as any)?.profile?.phoneE164,
          defaultBusinessId: (data as any)?.profile?.defaultBusinessId
        },
        business: (data as any)?.business ? {
          id: (data as any)?.business?.id,
          name: (data as any)?.business?.name,
          description: (data as any)?.business?.description,
          phone: (data as any)?.business?.phone,
          replyToEmail: (data as any)?.business?.replyToEmail,
          taxRateDefault: (data as any)?.business?.taxRateDefault,
          logoUrl: (data as any)?.business?.logoUrl,
          lightLogoUrl: (data as any)?.business?.lightLogoUrl,
          role: (data as any)?.business?.role
        } : null
      };
    },
    staleTime: 30_000,
    retry: 2,
  });
}