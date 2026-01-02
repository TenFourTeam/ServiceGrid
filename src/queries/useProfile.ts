import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { useAuth } from '@/hooks/useBusinessAuth';
import { useAuthApi } from '@/hooks/useAuthApi';

export function useProfile() {
  const { userId } = useAuth();
  const authApi = useAuthApi();

  return useQuery({
    queryKey: queryKeys.profile.byId(userId || '', ''),
    enabled: !!userId,
    queryFn: async () => {
      console.info('[useProfile] fetching profile via edge function');
      
      const { data, error } = await authApi.invoke('get-profile', {
        method: 'GET',
      });
      
      if (error) {
        console.error('[useProfile] error:', error);
        throw new Error(error.message || 'Failed to fetch profile');
      }
      
      if (!data?.profile) {
        console.warn('[useProfile] profile not found');
        return null;
      }
      
      return {
        profile: {
          id: data.profile.id,
          fullName: data.profile.fullName,
          phoneE164: data.profile.phoneE164,
          defaultBusinessId: data.profile.defaultBusinessId
        },
        business: data.business ? {
          id: data.business.id,
          name: data.business.name,
          description: data.business.description,
          phone: data.business.phone,
          replyToEmail: data.business.replyToEmail,
          taxRateDefault: data.business.taxRateDefault,
          logoUrl: data.business.logoUrl,
          lightLogoUrl: data.business.lightLogoUrl,
          createdAt: data.business.createdAt,
          role: data.business.role
        } : null
      };
    },
    staleTime: 30_000,
    retry: 2,
  });
}
