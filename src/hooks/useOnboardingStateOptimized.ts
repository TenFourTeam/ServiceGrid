import { useMemo } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useStore } from '@/store/useAppStore';
import { useDashboardData } from './useDashboardData';

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
  const { data: dashboardData } = useDashboardData();
  const { user } = useUser();
  const { business } = useStore();

  return useMemo(() => {
    // If not enabled or no data yet, return default state
    if (!enabled || !dashboardData) {
      return {
        hasNameAndBusiness: false,
        hasCustomers: false,
        hasJobs: false,
        hasQuotes: false,
        bankLinked: false,
        subscribed: false,
        completionPercentage: 0,
        nextAction: 'Loading...',
        isComplete: false,
        showIntentPicker: false
      };
    }

    // Check if user has set up their name and business name
    const hasUserName = !!(user?.firstName || user?.fullName);
    const hasBusinessName = business?.name && business.name !== 'My Business';
    const hasNameAndBusiness = hasUserName && hasBusinessName;

    const hasCustomers = (dashboardData.counts?.customers ?? 0) > 0;
    const hasJobs = (dashboardData.counts?.jobs ?? 0) > 0;
    const hasQuotes = (dashboardData.counts?.quotes ?? 0) > 0;
    const bankLinked = dashboardData.stripeStatus?.chargesEnabled ?? false;
    const subscribed = dashboardData.subscription?.subscribed ?? false;

    const completedSteps = [
      hasNameAndBusiness,
      hasCustomers,
      hasJobs || hasQuotes, // Either job OR quote counts as activation
      bankLinked,
      subscribed
    ].filter(Boolean).length;

    const completionPercentage = (completedSteps / 5) * 100;
    const isComplete = completedSteps === 5;
    
    // Show intent picker if user has no customers AND no jobs AND no quotes
    const showIntentPicker = hasNameAndBusiness && !hasCustomers && !hasJobs && !hasQuotes;

    let nextAction: string | null = null;
    if (!hasNameAndBusiness) {
      nextAction = 'Set up your profile';
    } else if (!hasCustomers && !hasJobs && !hasQuotes) {
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
  }, [dashboardData, user, business, enabled]);
}