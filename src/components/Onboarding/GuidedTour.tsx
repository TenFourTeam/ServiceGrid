import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { onboardingSteps } from './onboardingSteps';
import { OnboardingOverlay } from './OnboardingOverlay';
import { AttentionRing } from './AttentionRing';
import { HintCard } from './HintCard';
import { useSpotlight } from '@/hooks/useSpotlight';

export function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    nextStep,
    markStepComplete,
    pauseTour,
    isComplete,
    dataReady,
    phase
  } = useOnboardingState({ enabled: true });

  const currentStepConfig = nextStep ? onboardingSteps[nextStep] : null;
  const { target } = useSpotlight(currentStepConfig?.selector);

  // Don't show tour if complete, paused, or data not ready
  if (!currentStepConfig || isComplete || phase === 'paused' || !dataReady) {
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
    markStepComplete(currentStepConfig.id);
  };

  const handleSkip = () => {
    if (currentStepConfig.canSkip) {
      markStepComplete(currentStepConfig.id);
    }
  };

  const handleClose = () => {
    pauseTour();
  };

  const handleNavigate = () => {
    navigate(currentStepConfig.route);
  };

  // Show attention ring if element exists but no overlay
  if (currentStepConfig.selector && target?.visible && phase === 'ready') {
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