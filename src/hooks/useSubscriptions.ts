import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { queryKeys } from "@/queries/keys";
import { useAuthApi } from "@/hooks/useAuthApi";

export interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  trialDaysLeft?: number;
  isTrialExpired?: boolean;
}

export function useSubscriptions() {
  const { userId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const statusQuery = useQuery<SubscriptionStatus, Error>({
    queryKey: queryKeys.billing.subscription(userId || ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('subscriptions-crud', {
        method: 'GET'
      });

      if (error) {
        throw new Error(error.message || 'Failed to check subscription');
      }

      const trialDaysLeft = data.subscription_end
        ? Math.max(0, Math.ceil((new Date(data.subscription_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : undefined;

      const isTrialExpired = trialDaysLeft !== undefined && trialDaysLeft <= 0;

      return {
        ...data,
        trialDaysLeft,
        isTrialExpired,
      } as SubscriptionStatus;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
  });

  const createCheckout = useMutation({
    mutationFn: async ({ 
      plan, 
      tier = 'pro' 
    }: { 
      plan: 'monthly' | 'yearly'; 
      tier?: 'basic' | 'pro' 
    }) => {
      const { data, error } = await authApi.invoke('subscriptions-crud', {
        method: 'POST',
        body: { action: 'create_checkout', plan, tier }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create checkout');
      }

      return data.url as string;
    },
  });

  const getPortalLink = useMutation({
    mutationFn: async () => {
      const { data, error } = await authApi.invoke('subscriptions-crud', {
        method: 'GET',
        queryParams: { action: 'portal_link' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get portal link');
      }

      return data.url as string;
    },
  });

  const manageQuoteSubscription = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await authApi.invoke('subscriptions-crud', {
        method: 'POST',
        body: { action: 'manage_quote_subscription', quoteId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create subscription');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes('') });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refetch: statusQuery.refetch,
    createCheckout,
    getPortalLink,
    manageQuoteSubscription,
  };
}
