/**
 * Streamlined onboarding state - reads directly from unified queries
 * No context duplication, no stale memoization
 */
import { useMemo } from 'react';
import { useAuthSnapshot } from '@/auth';
import { 
  useBusiness, 
  useProfile, 
  useCustomersCount, 
  useJobsCount, 
  useQuotesCount,
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
  completionPercentage: number;
  nextAction: string | null;
  isComplete: boolean;
  showIntentPicker: boolean;
}

export function useOnboardingState(): OnboardingState {
  const { snapshot } = useAuthSnapshot();
  const businessId = snapshot.businessId || '';
  
  // Direct query consumption - no context layer
  const { data: business, isLoading: businessLoading, isFetching: businessFetching } = useBusiness();
  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useProfile();
  const { data: customersCount, isLoading: customersLoading } = useCustomersCount();
  const { data: jobsCount, isLoading: jobsLoading } = useJobsCount();
  const { data: quotesCount, isLoading: quotesLoading } = useQuotesCount();
  const { data: stripeStatus, isLoading: stripeLoading } = useStripeConnectStatus();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscriptionStatus();

  return useMemo(() => {
    const loading = businessLoading || profileLoading || customersLoading || 
                   jobsLoading || quotesLoading || stripeLoading || subscriptionLoading;

    // Don't show incomplete during active fetching to prevent flickering
    const isRefetching = businessFetching || profileFetching;

    // Simple, readable guard logic - preserve completion during updates
    const profileComplete = !!(
      profile?.fullName?.trim() &&
      profile?.phoneE164 &&
      business?.name?.trim()
    );

    const hasContent = (jobsCount ?? 0) > 0 || (quotesCount ?? 0) > 0;
    const hasCustomers = (customersCount ?? 0) > 0;
    const bankLinked = stripeStatus?.chargesEnabled ?? false;
    const subscribed = subscription?.subscribed ?? false;

    // Calculate completion
    const steps = [profileComplete, hasCustomers, hasContent, bankLinked, subscribed];
    const completedSteps = steps.filter(Boolean).length;
    const completionPercentage = Math.round((completedSteps / steps.length) * 100);

    // Determine next action
    let nextAction: string | null = null;
    if (!profileComplete) nextAction = 'Complete your profile';
    else if (!hasCustomers) nextAction = 'Add your first customer';
    else if (!hasContent) nextAction = 'Create a quote or schedule a job';
    else if (!bankLinked) nextAction = 'Connect your bank account';
    else if (!subscribed) nextAction = 'Activate your subscription';

    const isComplete = completedSteps === steps.length;
    const showIntentPicker = profileComplete && !hasCustomers && !hasContent;

    return {
      profileComplete,
      hasContent,
      hasCustomers,
      bankLinked,
      subscribed,
      loading,
      completionPercentage,
      nextAction,
      isComplete,
      showIntentPicker,
    };
  }, [
    business?.name,
    profile?.fullName,
    profile?.phoneE164,
    customersCount,
    jobsCount,
    quotesCount,
    stripeStatus?.chargesEnabled,
    subscription?.subscribed,
    businessLoading,
    profileLoading,
    customersLoading,
    jobsLoading,
    quotesLoading,
    stripeLoading,
    subscriptionLoading,
  ]);
}