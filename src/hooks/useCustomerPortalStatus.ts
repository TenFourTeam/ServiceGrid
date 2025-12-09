import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export type PortalAccessStatus = 'active' | 'pending' | 'none';

export interface CustomerPortalStatus {
  status: PortalAccessStatus;
  hasAccount: boolean;
  hasPendingInvite: boolean;
  inviteSentAt?: string;
  lastLoginAt?: string;
}

export function useCustomerPortalStatus(customerId: string | undefined) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['customer-portal-status', customerId],
    queryFn: async (): Promise<CustomerPortalStatus> => {
      if (!customerId) {
        return { status: 'none', hasAccount: false, hasPendingInvite: false };
      }

      const { data, error } = await authApi.invoke(`customer-portal-status?customerId=${customerId}`, {
        method: 'GET',
      });

      if (error) {
        console.error('Error fetching portal status:', error);
        return { status: 'none', hasAccount: false, hasPendingInvite: false };
      }

      return data as CustomerPortalStatus;
    },
    enabled: !!customerId,
    staleTime: 30000, // 30 seconds
  });
}
