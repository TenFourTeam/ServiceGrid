import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { queryKeys } from "@/queries/keys";
import { useAuthApi } from "@/hooks/useAuthApi";
import type { ConnectStatus } from "@/hooks/useStripeConnectStatus";

export function useStripeConnect(opts?: { enabled?: boolean }) {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const enabled = (opts?.enabled ?? true);

  const statusQuery = useQuery<ConnectStatus | null, Error>({
    queryKey: queryKeys.billing.stripeStatus(businessId || ''),
    enabled: enabled && !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('stripe-connect-crud', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch Stripe connect status');
      }
      
      return data as ConnectStatus;
    },
    staleTime: 30_000,
  });

  const getOnboardingLink = useMutation({
    mutationFn: async () => {
      const { data, error } = await authApi.invoke('stripe-connect-crud', {
        method: 'GET',
        queryParams: { action: 'onboarding_link' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get onboarding link');
      }

      return data.url as string;
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await authApi.invoke('stripe-connect-crud', {
        method: 'POST',
        body: { action: 'disconnect' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to disconnect');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.stripeStatus(businessId || '') });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refetch: statusQuery.refetch,
    getOnboardingLink,
    disconnect,
  };
}
