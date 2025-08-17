import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { queryKeys } from './keys';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

export function useBusiness(enabled: boolean = true) {
  const { userId, getToken } = useAuth();
  const authApi = createAuthEdgeApi(getToken);
  
  return useQuery({
    queryKey: queryKeys.business.current(),
    enabled: enabled && !!userId,
    queryFn: async () => {
      console.info('[useBusiness] fetching business via edge function');
      
      const { data, error } = await authApi.invoke('business-info');
      
      if (error) {
        console.error('[useBusiness] error:', error);
        throw new Error(error.message || 'Failed to fetch business');
      }
      
      if (!data?.business) {
        console.warn('[useBusiness] business not found');
        return null;
      }
      
      return {
        id: data.business.id,
        name: data.business.name,
        phone: data.business.phone,
        replyToEmail: data.business.replyToEmail,
        taxRateDefault: data.business.taxRateDefault,
        logoUrl: data.business.logoUrl,
        lightLogoUrl: data.business.lightLogoUrl,
        role: data.business.role
      };
    },
    staleTime: 30_000,
    retry: 2,
  });
}
