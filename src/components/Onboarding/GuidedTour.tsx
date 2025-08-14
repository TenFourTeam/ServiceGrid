import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnboardingState } from '@/onboarding/useOnboardingState';
import { onboardingSteps } from './onboardingSteps';
import { OnboardingOverlay } from './OnboardingOverlay';
import { AttentionRing } from './AttentionRing';
import { HintCard } from './HintCard';
import { useSpotlight } from '@/hooks/useSpotlight';

export function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentStepId, allComplete } = useOnboardingState();

  const currentStepConfig = currentStepId ? onboardingSteps[currentStepId] : null;
  const { target } = useSpotlight(currentStepConfig?.selector);

  // Don't show tour if complete or no current step
  if (!currentStepConfig || allComplete) {
    return null;
  }

  // Log warning if selector is specified but element not found
  if (currentStepConfig.selector && !target?.visible) {
    console.warn(`[GuidedTour] Element not found for selector: ${currentStepConfig.selector}`);
  }

  const handleAdvance = () => {
    if (currentStepConfig.onAdvance) {
      currentStepConfig.onAdvance();
    }
    // Step completion is now handled by data changes
  };

  const handleSkip = () => {
    // Skip is handled by navigation
  };

  const handleClose = () => {
    // Close tour
  };

  const handleNavigate = () => {
    navigate(currentStepConfig.route);
  };

  // Show attention ring if element exists but no overlay
  if (currentStepConfig.selector && target?.visible) {
    return (
      <AttentionRing 
        targetSelector={currentStepConfig.selector}
        pulse={true}
        color="primary"
      />
    );
  }

  // Show overlay with hint card if we have a target
  if (currentStepConfig.selector && target?.visible) {
    return (
      <OnboardingOverlay targetSelector={currentStepConfig.selector} onClose={handleClose}>
        <HintCard
          title={currentStepConfig.title}
          hint={currentStepConfig.hint}
          onNext={handleAdvance}
          onSkip={currentStepConfig.canSkip ? handleSkip : undefined}
          onClose={handleClose}
          onNavigate={handleNavigate}
          currentRoute={location.pathname}
          targetRoute={currentStepConfig.route}
          canSkip={currentStepConfig.canSkip}
        />
      </OnboardingOverlay>
    );
  }

  return null;
}