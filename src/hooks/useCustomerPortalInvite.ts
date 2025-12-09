import { useMutation } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';

interface SendInviteParams {
  customerId: string;
  businessId: string;
}

export function useCustomerPortalInvite() {
  const authApi = useAuthApi();

  const sendInviteMutation = useMutation({
    mutationFn: async ({ customerId, businessId }: SendInviteParams) => {
      const { data, error } = await authApi.invoke('customer-portal-invite', {
        method: 'POST',
        body: {
          customer_id: customerId,
          business_id: businessId,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send invite');
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Portal invite sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send portal invite');
    },
  });

  return {
    sendInvite: sendInviteMutation.mutate,
    sendInviteAsync: sendInviteMutation.mutateAsync,
    isLoading: sendInviteMutation.isPending,
    error: sendInviteMutation.error,
  };
}
