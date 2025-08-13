import { useState, useCallback, useEffect } from 'react';
import { OnboardingProgress, OnboardingStep, OnboardingIntent } from '@/types/onboarding';
import { useOnboardingState } from './useOnboardingState';

const STORAGE_KEY = 'onboarding_progress';

function getInitialProgress(): OnboardingProgress {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fall through to default
    }
  }
  
  return {
    completedSteps: {} as Record<OnboardingStep, boolean>,
    dismissedHints: [],
    lastSeenAt: new Date().toISOString(),
    isPaused: false
  };
}

export function useOnboardingStateEnhanced() {
  const [progress, setProgress] = useState<OnboardingProgress>(getInitialProgress);
  const basicState = useOnboardingState();

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const markStepComplete = useCallback((step: OnboardingStep) => {
    setProgress(prev => ({
      ...prev,
      completedSteps: {
        ...prev.completedSteps,
        [step]: true
      },
      lastSeenAt: new Date().toISOString()
    }));
  }, []);

  const setCurrentStep = useCallback((step?: OnboardingStep) => {
    setProgress(prev => ({
      ...prev,
      currentStep: step,
      lastSeenAt: new Date().toISOString()
    }));
  }, []);

  const setIntent = useCallback((intent: OnboardingIntent) => {
    setProgress(prev => ({
      ...prev,
      intent,
      lastSeenAt: new Date().toISOString()
    }));
  }, []);

  const dismissHint = useCallback((hintId: string) => {
    setProgress(prev => ({
      ...prev,
      dismissedHints: [...prev.dismissedHints, hintId]
    }));
  }, []);

  const pauseTour = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      isPaused: true,
      currentStep: undefined
    }));
  }, []);

  const resumeTour = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      isPaused: false
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      completedSteps: {} as Record<OnboardingStep, boolean>,
      dismissedHints: [],
      lastSeenAt: new Date().toISOString(),
      isPaused: false
    });
  }, []);

  // Determine next step based on basic state and progress
  const getNextStep = useCallback((): OnboardingStep | undefined => {
    if (progress.isPaused) return undefined;

    // If we have an intent but haven't started, show intent picker
    if (!progress.intent && !basicState.hasNameAndBusiness) {
      return 'welcome_intent';
    }

    // Follow intent-based progression
    if (progress.intent === 'job' && !basicState.hasJobs) {
      return 'create_job';
    }
    
    if (progress.intent === 'quote' && !basicState.hasQuotes) {
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
  }, [progress, basicState]);

  return {
    progress,
    basicState,
    markStepComplete,
    setCurrentStep,
    setIntent,
    dismissHint,
    pauseTour,
    resumeTour,
    resetProgress,
    nextStep: getNextStep(),
    isComplete: basicState.isComplete
  };
}