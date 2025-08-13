import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";

export interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  trialDaysLeft: number;
  isTrialExpired: boolean;
}

const TRIAL_DURATION_DAYS = 7;

export function useSubscriptionStatus(opts?: { enabled?: boolean }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<SubscriptionStatus | null, Error>({
    queryKey: ["subscription", "status"],
    enabled,
    queryFn: async () => {
      try {
        const data = await edgeFetchJson("check-subscription", getToken);
        
        // Calculate trial days from user creation (simplified - using current logic)
        const today = new Date();
        const trialStart = new Date(); // In real app, this would be user's signup date
        trialStart.setDate(today.getDate() - 3); // Simulate 3 days since signup
        
        const diffTime = today.getTime() - trialStart.getTime();
        const daysSinceSignup = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const trialDaysLeft = Math.max(0, TRIAL_DURATION_DAYS - daysSinceSignup);
        const isTrialExpired = trialDaysLeft === 0 && !data.subscribed;

        return {
          subscribed: data.subscribed || false,
          subscription_tier: data.subscription_tier,
          subscription_end: data.subscription_end,
          trialDaysLeft,
          isTrialExpired,
        };
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
        return {
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          trialDaysLeft: TRIAL_DURATION_DAYS,
          isTrialExpired: false,
        };
      }
    },
    staleTime: 30_000,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}