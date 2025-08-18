import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

export function useProfile(businessId?: string) {
  const { userId, getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));

  return useQuery({
    queryKey: businessId ? queryKeys.profile.forBusiness(businessId) : queryKeys.profile.current(),
    enabled: !!userId,
    queryFn: async () => {
      console.info('[useProfile] fetching profile via edge function', { businessId });
      
      const queryParams = businessId ? { businessId } : {};
      const { data, error } = await authApi.invoke('get-profile', {
        method: 'GET',
        queryParams
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
          phone: data.business.phone,
          replyToEmail: data.business.replyToEmail,
          taxRateDefault: data.business.taxRateDefault,
          logoUrl: data.business.logoUrl,
          lightLogoUrl: data.business.lightLogoUrl,
          role: data.business.role
        } : null
      };
    },
    staleTime: 30_000,
    retry: 2,
  });
}