import { useMemo, useState, useCallback, useEffect } from 'react';
import { useSupabaseCustomers } from './useSupabaseCustomers';
import { useSupabaseJobs } from './useSupabaseJobs';  
import { useSupabaseQuotes } from './useSupabaseQuotes';
import { useStripeConnectStatus } from './useStripeConnectStatus';
import { useSubscriptionStatus } from './useSubscriptionStatus';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useStore } from '@/store/useAppStore';
import { OnboardingStep, OnboardingIntent } from '@/types/onboarding';
import { useDebouncedValue } from './useDebouncedValue';

export type OnboardingPhase = 'idle' | 'ready' | 'spotlight' | 'awaitingAction' | 'completed' | 'paused';

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
  // Enhanced fields
  phase: OnboardingPhase;
  version: number;
  dataReady: boolean;
  nextStep?: OnboardingStep;
  completedSteps: Record<OnboardingStep, boolean>;
  intent?: OnboardingIntent;
  dismissedHints: string[];
  lastSeenAt: string;
  isPaused: boolean;
}

interface StoredProgress {
  completedSteps: Record<OnboardingStep, boolean>;
  intent?: OnboardingIntent;
  dismissedHints: string[];
  lastSeenAt: string;
  isPaused: boolean;
  version: number;
}

const STORAGE_KEY = 'onboarding_progress';
const CURRENT_VERSION = 2;

function getStoredProgress(): StoredProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultProgress();
    
    const parsed = JSON.parse(stored);
    if (parsed.version !== CURRENT_VERSION) {
      console.info('[Onboarding] Version mismatch, resetting progress');
      return getDefaultProgress();
    }
    
    return parsed;
  } catch {
    console.warn('[Onboarding] Failed to parse stored progress, resetting');
    return getDefaultProgress();
  }
}

function getDefaultProgress(): StoredProgress {
  return {
    completedSteps: {} as Record<OnboardingStep, boolean>,
    dismissedHints: [],
    lastSeenAt: new Date().toISOString(),
    isPaused: false,
    version: CURRENT_VERSION
  };
}

export function useOnboardingState(opts?: { enabled?: boolean }): OnboardingProgress & {
  markStepComplete: (step: OnboardingStep) => void;
  setIntent: (intent: OnboardingIntent) => void;
  dismissHint: (hintId: string) => void;
  pauseTour: () => void;
  resumeTour: () => void;
  resetProgress: () => void;
} {
  const enabled = opts?.enabled ?? true;
  const { data: customersData, isSuccess: customersSuccess } = useSupabaseCustomers({ enabled });
  const { data: jobsData, isSuccess: jobsSuccess } = useSupabaseJobs({ enabled });
  const { data: quotesData, isSuccess: quotesSuccess } = useSupabaseQuotes({ enabled });
  const { data: stripeStatus, isSuccess: stripeSuccess } = useStripeConnectStatus({ enabled });
  const { data: subscriptionData, isSuccess: subscriptionSuccess } = useSubscriptionStatus({ enabled });
  const { user } = useUser();
  const { business } = useStore();

  const [storedProgress, setStoredProgress] = useState<StoredProgress>(getStoredProgress);

  // Save to localStorage whenever stored progress changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProgress));
  }, [storedProgress]);

  const markStepComplete = useCallback((step: OnboardingStep) => {
    setStoredProgress(prev => ({
      ...prev,
      completedSteps: { ...prev.completedSteps, [step]: true },
      lastSeenAt: new Date().toISOString()
    }));
  }, []);

  const setIntent = useCallback((intent: OnboardingIntent) => {
    setStoredProgress(prev => ({
      ...prev,
      intent,
      lastSeenAt: new Date().toISOString()
    }));
  }, []);

  const dismissHint = useCallback((hintId: string) => {
    setStoredProgress(prev => ({
      ...prev,
      dismissedHints: [...prev.dismissedHints, hintId]
    }));
  }, []);

  const pauseTour = useCallback(() => {
    setStoredProgress(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  const resumeTour = useCallback(() => {
    setStoredProgress(prev => ({
      ...prev,
      isPaused: false
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setStoredProgress(getDefaultProgress());
  }, []);

  const basicState = useMemo(() => {
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

  // Determine data readiness
  const dataReady = enabled && customersSuccess && jobsSuccess && quotesSuccess && stripeSuccess && subscriptionSuccess;

  // Calculate next step with debouncing
  const nextStep = useMemo((): OnboardingStep | undefined => {
    if (storedProgress.isPaused || !dataReady) return undefined;

    // If we have an intent but haven't started, show intent picker
    if (!storedProgress.intent && !basicState.hasNameAndBusiness) {
      return 'welcome_intent';
    }

    // Follow intent-based progression
    if (storedProgress.intent === 'job' && !basicState.hasJobs) {
      return 'create_job';
    }
    
    if (storedProgress.intent === 'quote' && !basicState.hasQuotes) {
      return 'create_quote';
    }

    if (!basicState.hasCustomers) {
      return 'create_customer';
    }

    if (!basicState.bankLinked) {
      return 'link_bank';
    }

    if (!basicState.subscribed) {
      return 'start_subscription';
    }

    return undefined; // Onboarding complete
  }, [storedProgress, basicState, dataReady]);

  const debouncedNextStep = useDebouncedValue(nextStep, 300);

  // Determine phase
  const phase: OnboardingPhase = useMemo(() => {
    if (storedProgress.isPaused) return 'paused';
    if (basicState.isComplete) return 'completed';
    if (!dataReady) return 'idle';
    if (debouncedNextStep) return 'ready';
    return 'idle';
  }, [storedProgress.isPaused, basicState.isComplete, dataReady, debouncedNextStep]);

  return {
    ...basicState,
    // Enhanced fields
    phase,
    version: CURRENT_VERSION,
    dataReady,
    nextStep: debouncedNextStep,
    completedSteps: storedProgress.completedSteps,
    intent: storedProgress.intent,
    dismissedHints: storedProgress.dismissedHints,
    lastSeenAt: storedProgress.lastSeenAt,
    isPaused: storedProgress.isPaused,
    // Actions
    markStepComplete,
    setIntent,
    dismissHint,
    pauseTour,
    resumeTour,
    resetProgress
  };
}