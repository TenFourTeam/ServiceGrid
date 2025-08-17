
import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { queryKeys } from "@/queries/keys";
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

export interface ConnectStatus {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  bank: { bankName?: string; last4?: string } | null;
  schedule: { interval: string; delay_days: number | null } | null;
  applicationFeeBps: number;
}

export function useStripeConnectStatus(opts?: { enabled?: boolean }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const { businessId } = useBusinessContext();
  const authApi = createAuthEdgeApi(getToken);
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<ConnectStatus | null, Error>({
    queryKey: queryKeys.billing.stripeStatus(businessId || ''),
    enabled: enabled && !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('connect-account-status');
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch Stripe connect status');
      }
      
      return data as ConnectStatus;
    },
    staleTime: 30_000,
  });
}
