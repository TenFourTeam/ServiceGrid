import { useEffect } from 'react';
import { useOnboardingState } from '@/hooks/useOnboardingStateOptimized';
import { toast } from 'sonner';

/**
 * Tracks onboarding progress and shows celebration toasts when steps complete
 */
export function OnboardingProgressTracker() {
  const onboarding = useOnboardingState();
  
  useEffect(() => {
    // Track completion of profile step
    if (onboarding.hasNameAndBusiness) {
      const hasShownProfileComplete = sessionStorage.getItem('profile-complete-shown');
      
      if (!hasShownProfileComplete) {
        sessionStorage.setItem('profile-complete-shown', 'true');
        
        // Small delay to ensure UI updates have processed
        setTimeout(() => {
          toast.success('Profile completed! 🎉', {
            description: `Great work! You're ${onboarding.completionPercentage}% complete.`,
            duration: 3000,
          });
        }, 500);
      }
    }
  }, [onboarding.hasNameAndBusiness, onboarding.completionPercentage]);

  // Reset completion flags when onboarding resets
  useEffect(() => {
    if (!onboarding.hasNameAndBusiness) {
      sessionStorage.removeItem('profile-complete-shown');
    }
  }, [onboarding.hasNameAndBusiness]);

  return null; // This component only tracks progress, no UI
}