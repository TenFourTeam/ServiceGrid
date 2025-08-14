
import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useAuthSnapshot } from "@/auth";
import { qk } from "@/queries/keys";

export interface ConnectStatus {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  bank: { bankName?: string; last4?: string } | null;
  schedule: { interval: string; delay_days: number | null } | null;
  applicationFeeBps: number;
}

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export function useStripeConnectStatus(opts?: { enabled?: boolean }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const { snapshot } = useAuthSnapshot();
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<ConnectStatus | null, Error>({
    queryKey: qk.stripeStatus(snapshot.businessId || ''),
    enabled: enabled && !!snapshot.businessId,
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/connect-account-status`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`connect-account-status failed: ${res.status} ${t}`);
      }
      const data = (await res.json()) as ConnectStatus;
      return data;
    },
    staleTime: 30_000,
  });
}
