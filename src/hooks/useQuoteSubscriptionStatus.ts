import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from "@/utils/authEdgeApi";

export interface QuoteSubscriptionStatus {
  hasActiveSubscription: boolean;
  activeSubscriptionInfo?: {
    quoteId: string;
    subscriptionId: string;
    frequency: string;
    nextBillingDate: string;
  };
  supersededQuotes: Array<{
    id: string;
    number: string;
    superseded_at: string;
    superseded_by_quote_id?: string;
  }>;
}

interface UseQuoteSubscriptionStatusOptions {
  customerId?: string;
  enabled?: boolean;
}

/**
 * Hook to check subscription status for a customer
 */
export function useQuoteSubscriptionStatus(opts?: UseQuoteSubscriptionStatusOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const enabled = isAuthenticated && !!businessId && !!opts?.customerId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.quotes(businessId || '').concat(['subscription-status', opts?.customerId || '']),
    enabled,
    queryFn: async () => {
      if (!opts?.customerId) {
        throw new Error('Customer ID is required');
      }

      console.info("[useQuoteSubscriptionStatus] checking subscription status for customer:", opts.customerId);
      
      const { data, error } = await authApi.invoke('quotes-crud', {
        method: 'GET',
        body: { 
          action: 'subscription-status',
          customerId: opts.customerId
        }
      });
      
      if (error) {
        console.error("[useQuoteSubscriptionStatus] error:", error);
        throw new Error(error.message || 'Failed to fetch subscription status');
      }
      
      return data as QuoteSubscriptionStatus;
    },
    staleTime: 30_000,
  });

  return {
    data: query.data,
    hasActiveSubscription: query.data?.hasActiveSubscription ?? false,
    activeSubscriptionInfo: query.data?.activeSubscriptionInfo,
    supersededQuotes: query.data?.supersededQuotes ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}