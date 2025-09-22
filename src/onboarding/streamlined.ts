/**
 * Streamlined onboarding state - reads directly from unified queries
 * No context duplication, no stale memoization
 */
import { useMemo } from 'react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { 
  // useBusiness integrated into useBusinessContext 
  useProfile, 
  useCustomersData,
  useJobsData, 
  useQuotesData,
  useStripeConnectStatus,
  useSubscriptionStatus 
} from '@/queries/unified';

export interface OnboardingState {
  // Core completion flags
  profileComplete: boolean;
  hasContent: boolean;
  hasCustomers: boolean;
  bankLinked: boolean;
  subscribed: boolean;
  
  // Loading states
  loading: boolean;
  
  // Derived state
  nextAction: string | null;
  showIntentPicker: boolean;
}

export function useOnboardingState(): OnboardingState {
  const { businessId, isAuthenticated, business, isLoadingBusiness } = useBusinessContext();
  
  // Direct query consumption - no context layer
  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useProfile();
  const { count: customersCount, isLoading: customersLoading } = useCustomersData();
  const { count: jobsCount, isLoading: jobsLoading } = useJobsData();
  const { count: quotesCount, isLoading: quotesLoading } = useQuotesData();
  const { data: stripeStatus, isLoading: stripeLoading } = useStripeConnectStatus();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscriptionStatus();

  return useMemo(() => {
    const loading = isLoadingBusiness || profileLoading || customersLoading || 
                   jobsLoading || quotesLoading || stripeLoading || subscriptionLoading;

    // Don't show incomplete during active fetching to prevent flickering
    const isRefetching = profileFetching;

    // Simple, readable guard logic - preserve completion during updates
    const profileComplete = !!(
      profile?.profile?.fullName?.trim() &&
      profile?.profile?.phoneE164 &&
      business?.name?.trim()
    );

    const hasContent = (jobsCount ?? 0) > 0 || (quotesCount ?? 0) > 0;
    const hasCustomers = (customersCount ?? 0) > 0;
    const bankLinked = stripeStatus?.chargesEnabled ?? false;
    const subscribed = subscription?.subscribed ?? false;

    // Determine next action and show intent picker
    let nextAction: string | null = null;
    if (!profileComplete) nextAction = 'Complete your profile';
    else if (!hasCustomers) nextAction = 'Add your first customer';
    else if (!hasContent) nextAction = 'Create a quote or schedule a job';
    else if (!bankLinked) nextAction = 'Connect your bank account';
    else if (!subscribed) nextAction = 'Activate your subscription';

    // Show intent picker for new users or when they need guidance
    const showIntentPicker = !loading && (!profileComplete || (profileComplete && !hasCustomers && !hasContent));

    return {
      profileComplete,
      hasContent,
      hasCustomers,
      bankLinked,
      subscribed,
      loading,
      nextAction,
      showIntentPicker,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.profile?.fullName,
    profile?.profile?.phoneE164,
    business?.name,
    customersCount,
    jobsCount,
    quotesCount,
    stripeStatus?.chargesEnabled,
    subscription?.subscribed,
    isLoadingBusiness,
    profileLoading,
    customersLoading,
    jobsLoading,
    quotesLoading,
    stripeLoading,
    subscriptionLoading,
  ]);
}