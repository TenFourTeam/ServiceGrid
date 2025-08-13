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
        
        // Calculate trial days from actual user creation date with debugging
        const today = new Date();
        const userCreatedAt = new Date(data.userCreatedAt || Date.now());
        
        // Debug logging for trial calculation
        console.log('Trial calculation debug:', {
          today: today.toISOString(),
          userCreatedAt: userCreatedAt.toISOString(),
          rawUserCreatedAt: data.userCreatedAt,
          subscribed: data.subscribed
        });
        
        // Use start of day for both dates to avoid timezone issues
        const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const userCreatedStartOfDay = new Date(userCreatedAt.getFullYear(), userCreatedAt.getMonth(), userCreatedAt.getDate());
        
        const diffTime = todayStartOfDay.getTime() - userCreatedStartOfDay.getTime();
        const daysSinceSignup = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const trialDaysLeft = Math.max(0, TRIAL_DURATION_DAYS - daysSinceSignup);
        const isTrialExpired = trialDaysLeft === 0 && !data.subscribed;
        
        console.log('Trial calculation result:', {
          daysSinceSignup,
          trialDaysLeft,
          isTrialExpired,
          todayStartOfDay: todayStartOfDay.toISOString(),
          userCreatedStartOfDay: userCreatedStartOfDay.toISOString()
        });

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