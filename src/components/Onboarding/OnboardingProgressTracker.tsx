import { useEffect } from 'react';
import { useOnboardingState } from '@/onboarding/useOnboardingState';
import { toast } from 'sonner';

/**
 * Tracks onboarding progress and shows celebration toasts when steps complete
 */
export function OnboardingProgressTracker() {
  const { stepOrder, completionByStep, progressPct, steps } = useOnboardingState();
  
  useEffect(() => {
    // Track completion of each step and show celebration
    for (const stepId of stepOrder) {
      const isComplete = completionByStep[stepId];
      const storageKey = `${stepId}-complete-shown`;
      const hasShownComplete = sessionStorage.getItem(storageKey);
      
      if (isComplete && !hasShownComplete) {
        sessionStorage.setItem(storageKey, 'true');
        
        // Small delay to ensure UI updates have processed
        setTimeout(() => {
          toast.success(`${steps[stepId].title} completed! 🎉`, {
            description: `Great work! You're ${progressPct}% complete.`,
            duration: 3000,
          });
        }, 500);
      }
    }
  }, [stepOrder, completionByStep, progressPct, steps]);

  // Reset completion flags when steps become incomplete again
  useEffect(() => {
    for (const stepId of stepOrder) {
      const isComplete = completionByStep[stepId];
      const storageKey = `${stepId}-complete-shown`;
      
      if (!isComplete) {
        sessionStorage.removeItem(storageKey);
      }
    }
  }, [stepOrder, completionByStep]);

  return null; // This component only tracks progress, no UI
}