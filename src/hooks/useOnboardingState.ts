import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useStore } from '@/store/useAppStore';
import { useDashboardData } from './useDashboardData';
import { useDebouncedValue } from './useDebouncedValue';
import { useOnboardingContext, OnboardingContext } from '@/components/Onboarding/useOnboardingContext';
import { computeNextStep, NextStepResult } from '@/components/Onboarding/computeNextStep';
import { OnboardingStep, OnboardingIntent, OnboardingProgress as TypedOnboardingProgress } from '@/types/onboarding';

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
  enabled: boolean;
  phase: 'idle' | 'ready' | 'spotlight' | 'awaitingAction' | 'completed' | 'paused';
  version: number;
  completedSteps: Record<OnboardingStep, boolean>;
  intent?: OnboardingIntent;
  dataReady: boolean;
  nextStep: OnboardingStep | null;
}

// Storage constants
const STORAGE_KEY = 'onboarding_progress';
const CURRENT_VERSION = 3; // Increment to force clean slate

// Storage utilities
function getStoredProgress(): TypedOnboardingProgress | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    if (parsed.version !== CURRENT_VERSION) {
      // Clear old version data
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function getDefaultProgress(): TypedOnboardingProgress {
  return {
    currentStep: undefined,
    completedSteps: {} as Record<OnboardingStep, boolean>,
    intent: undefined,
    dismissedHints: [],
    lastSeenAt: new Date().toISOString(),
    isPaused: false
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
  const context = useOnboardingContext();
  const debouncedContext = useDebouncedValue(context, 300);
  
  // Local state management
  const [storedProgress, setStoredProgress] = useState<TypedOnboardingProgress>(() => 
    getStoredProgress() || getDefaultProgress()
  );
  
  // Persist to localStorage whenever storedProgress changes
  useEffect(() => {
    const toStore = { ...storedProgress, version: CURRENT_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [storedProgress]);

  // Control functions
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
      dismissedHints: [...prev.dismissedHints, hintId],
      lastSeenAt: new Date().toISOString()
    }));
  }, []);
  
  const pauseTour = useCallback(() => {
    setStoredProgress(prev => ({
      ...prev,
      isPaused: true,
      lastSeenAt: new Date().toISOString()
    }));
  }, []);
  
  const resumeTour = useCallback(() => {
    setStoredProgress(prev => ({
      ...prev,
      isPaused: false,
      lastSeenAt: new Date().toISOString()
    }));
  }, []);
  
  const resetProgress = useCallback(() => {
    setStoredProgress(getDefaultProgress());
  }, []);

  // Compute next step using pure function
  const nextStepResult: NextStepResult = useMemo(() => {
    if (!enabled || storedProgress.isPaused) {
      return {
        nextStep: null,
        phase: 'paused',
        showIntentPicker: false
      };
    }
    
    return computeNextStep({
      context: debouncedContext,
      completedSteps: storedProgress.completedSteps,
      intent: storedProgress.intent
    });
  }, [enabled, debouncedContext, storedProgress.completedSteps, storedProgress.intent, storedProgress.isPaused]);

  // Legacy compatibility layer
  const legacyState = useMemo(() => {
    const hasNameAndBusiness = debouncedContext.hasNameAndBusiness;
    const hasCustomers = debouncedContext.customersCount > 0;
    const hasJobs = debouncedContext.jobsCount > 0;
    const hasQuotes = debouncedContext.quotesCount > 0;
    const bankLinked = debouncedContext.bankLinked;
    const subscribed = debouncedContext.subscribed;

    const completedSteps = [
      hasNameAndBusiness,
      hasCustomers,
      hasJobs || hasQuotes,
      bankLinked,
      subscribed
    ].filter(Boolean).length;

    const completionPercentage = (completedSteps / 5) * 100;
    const isComplete = completedSteps === 5;

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
      isComplete
    };
  }, [debouncedContext]);

  return {
    ...legacyState,
    showIntentPicker: nextStepResult.showIntentPicker,
    
    // Enhanced fields
    enabled,
    phase: nextStepResult.phase,
    version: debouncedContext.version,
    completedSteps: storedProgress.completedSteps,
    intent: storedProgress.intent,
    dataReady: debouncedContext.dataReady,
    nextStep: nextStepResult.nextStep,
    
    // Control functions
    markStepComplete,
    setIntent,
    dismissHint,
    pauseTour,
    resumeTour,
    resetProgress
  };
}