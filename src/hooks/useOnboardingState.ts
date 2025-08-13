import { useMemo } from 'react';
import { useSupabaseCustomers } from './useSupabaseCustomers';
import { useSupabaseJobs } from './useSupabaseJobs';  
import { useSupabaseQuotes } from './useSupabaseQuotes';
import { useStripeConnectStatus } from './useStripeConnectStatus';
import { useSubscriptionStatus } from './useSubscriptionStatus';

export interface OnboardingProgress {
  hasCustomers: boolean;
  hasJobs: boolean; 
  hasQuotes: boolean;
  bankLinked: boolean;
  subscribed: boolean;
  completionPercentage: number;
  nextAction: string | null;
  isComplete: boolean;
  showIntentPicker: boolean;
}

export function useOnboardingState(opts?: { enabled?: boolean }): OnboardingProgress {
  const enabled = opts?.enabled ?? true;
  const { data: customersData } = useSupabaseCustomers({ enabled });
  const { data: jobsData } = useSupabaseJobs({ enabled });
  const { data: quotesData } = useSupabaseQuotes({ enabled });
  const { data: stripeStatus } = useStripeConnectStatus({ enabled });
  const { data: subscriptionData } = useSubscriptionStatus({ enabled });

  return useMemo(() => {
    const hasCustomers = (customersData?.rows?.length ?? 0) > 0;
    const hasJobs = (jobsData?.rows?.length ?? 0) > 0;
    const hasQuotes = (quotesData?.rows?.length ?? 0) > 0;
    const bankLinked = stripeStatus?.chargesEnabled ?? false;
    const subscribed = subscriptionData?.subscribed ?? false;

    const completedSteps = [
      hasCustomers,
      hasJobs || hasQuotes, // Either job OR quote counts as activation
      bankLinked,
      subscribed
    ].filter(Boolean).length;

    const completionPercentage = (completedSteps / 4) * 100;
    const isComplete = completedSteps === 4;
    
    // Show intent picker if user has no customers AND no jobs AND no quotes
    const showIntentPicker = !hasCustomers && !hasJobs && !hasQuotes;

    let nextAction: string | null = null;
    if (!hasCustomers && !hasJobs && !hasQuotes) {
      nextAction = 'Choose your first action';
    } else if (!hasCustomers) {
      nextAction = 'Add your first customer';
    } else if (!hasJobs && !hasQuotes) {
      nextAction = 'Create a job or quote';
    } else if (!bankLinked) {
      nextAction = 'Link your bank account';
    } else if (!subscribed) {
      nextAction = 'Start your subscription';
    }

    return {
      hasCustomers,
      hasJobs,
      hasQuotes,
      bankLinked,
      subscribed,
      completionPercentage,
      nextAction,
      isComplete,
      showIntentPicker
    };
  }, [customersData, jobsData, quotesData, stripeStatus, subscriptionData]);
}