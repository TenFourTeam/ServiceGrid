import { useMemo } from 'react';
import { useSupabaseCustomers } from './useSupabaseCustomers';
import { useSupabaseJobs } from './useSupabaseJobs';  
import { useSupabaseQuotes } from './useSupabaseQuotes';
import { useStripeConnectStatus } from './useStripeConnectStatus';
import { useSubscriptionStatus } from './useSubscriptionStatus';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useStore } from '@/store/useAppStore';

export interface OnboardingProgress {
  hasNameAndBusiness: boolean;
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
  const { user } = useUser();
  const { business } = useStore();

  return useMemo(() => {
    // Check if user has set up their name and business name
    const hasUserName = !!(user?.firstName || user?.fullName);
    const hasBusinessName = business?.name && business.name !== 'My Business';
    const hasNameAndBusiness = hasUserName && hasBusinessName;

    const hasCustomers = (customersData?.rows?.length ?? 0) > 0;
    const hasJobs = (jobsData?.rows?.length ?? 0) > 0;
    const hasQuotes = (quotesData?.rows?.length ?? 0) > 0;
    const bankLinked = stripeStatus?.chargesEnabled ?? false;
    const subscribed = subscriptionData?.subscribed ?? false;

    const completedSteps = [
      hasNameAndBusiness,
      bankLinked,
      hasCustomers,
      hasQuotes,
      hasJobs
    ].filter(Boolean).length;

    const completionPercentage = (completedSteps / 5) * 100;
    const isComplete = completedSteps === 5;
    
    // Show intent picker if user has no customers AND no jobs AND no quotes
    const showIntentPicker = hasNameAndBusiness && bankLinked && !hasCustomers && !hasJobs && !hasQuotes;

    let nextAction: string | null = null;
    if (!hasNameAndBusiness) {
      nextAction = 'Set up your profile';
    } else if (!bankLinked) {
      nextAction = 'Link your bank account';
    } else if (!hasCustomers) {
      nextAction = 'Add your first customer';
    } else if (!hasQuotes) {
      nextAction = 'Create a quote';
    } else if (!hasJobs) {
      nextAction = 'Schedule a job';
    }

    return {
      hasNameAndBusiness,
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
  }, [customersData, jobsData, quotesData, stripeStatus, subscriptionData, user, business]);
}