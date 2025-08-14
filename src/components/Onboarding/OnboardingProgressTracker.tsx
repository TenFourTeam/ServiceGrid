import { useEffect } from 'react';
import { useOnboardingState } from '@/onboarding/streamlined';
import { toast } from 'sonner';

/**
 * Tracks onboarding progress and shows celebration toasts when steps complete
 */
export function OnboardingProgressTracker() {
  const { completionPercentage, isComplete } = useOnboardingState();
  
  // Simplified to just track overall completion
  return null; // Disable for now since streamlined doesn't have step granularity
}