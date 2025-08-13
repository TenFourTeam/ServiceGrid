import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnboardingStateEnhanced } from '@/hooks/useOnboardingStateEnhanced';
import { onboardingSteps } from './onboardingSteps';
import { OnboardingOverlay } from './OnboardingOverlay';
import { AttentionRing } from './AttentionRing';
import { HintCard } from './HintCard';
import { useSpotlight } from '@/hooks/useSpotlight';

export function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    progress,
    nextStep,
    markStepComplete,
    setCurrentStep,
    pauseTour,
    isComplete
  } = useOnboardingStateEnhanced();

  const currentStepConfig = nextStep ? onboardingSteps[nextStep] : null;
  const { target } = useSpotlight(currentStepConfig?.selector);

  // Auto-navigate to step route if needed
  useEffect(() => {
    if (!currentStepConfig || isComplete) return;
    
    const isOnCorrectRoute = location.pathname === currentStepConfig.route;
    if (!isOnCorrectRoute) {
      navigate(currentStepConfig.route);
    }
  }, [currentStepConfig, location.pathname, navigate, isComplete]);

  // Check if step is already complete
  useEffect(() => {
    if (!currentStepConfig || isComplete) return;

    const checkCompletion = async () => {
      const isComplete = await currentStepConfig.guard();
      if (isComplete) {
        markStepComplete(currentStepConfig.id);
      }
    };

    checkCompletion();
  }, [currentStepConfig, markStepComplete, isComplete]);

  // Don't show tour if complete or paused
  if (!currentStepConfig || isComplete || progress.isPaused) {
    return null;
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

  // Show attention ring if element exists but no overlay
  if (currentStepConfig.selector && target?.visible && !progress.currentStep) {
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
          canSkip={currentStepConfig.canSkip}
        />
      </OnboardingOverlay>
    );
  }

  return null;
}