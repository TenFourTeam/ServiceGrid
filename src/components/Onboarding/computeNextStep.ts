import { OnboardingStep, OnboardingIntent } from '@/types/onboarding';
import { OnboardingContext } from './useOnboardingContext';
import { onboardingSteps } from './onboardingSteps';

export interface NextStepInput {
  context: OnboardingContext;
  completedSteps: Record<OnboardingStep, boolean>;
  intent?: OnboardingIntent;
}

export interface NextStepResult {
  nextStep: OnboardingStep | null;
  phase: 'idle' | 'ready' | 'spotlight' | 'awaitingAction' | 'completed' | 'paused';
  showIntentPicker: boolean;
}

/**
 * Pure, deterministic function to compute the next onboarding step.
 * This function is monotonic (never goes backward) and testable.
 */
export function computeNextStep(input: NextStepInput): NextStepResult {
  const { context, completedSteps, intent } = input;

  // If data isn't ready, stay idle
  if (!context.dataReady) {
    return {
      nextStep: null,
      phase: 'idle',
      showIntentPicker: false
    };
  }

  // Check if user has basic setup (name and business)
  if (!context.hasNameAndBusiness) {
    return {
      nextStep: null,
      phase: 'awaitingAction',
      showIntentPicker: false
    };
  }

  // Show intent picker if no customers/jobs/quotes and no intent set
  if (!intent && context.customersCount === 0 && context.jobsCount === 0 && context.quotesCount === 0) {
    return {
      nextStep: 'welcome_intent',
      phase: 'ready',
      showIntentPicker: true
    };
  }

  // Define step sequence based on intent
  const stepSequence = getStepSequence(intent);

  // Find the first incomplete step in the sequence
  for (const stepId of stepSequence) {
    const step = onboardingSteps[stepId];
    const isCompleted = completedSteps[stepId];
    
    if (!isCompleted && step.guard) {
      // Check if this step is needed using the guard function
      const guardResult = step.guard(context);
      if (!guardResult) { // Guard returns false when step should be shown
        return {
          nextStep: stepId,
          phase: 'ready',
          showIntentPicker: false
        };
      }
    }
  }

  // All steps completed
  return {
    nextStep: null,
    phase: 'completed',
    showIntentPicker: false
  };
}

function getStepSequence(intent?: OnboardingIntent): OnboardingStep[] {
  if (!intent) {
    // Default sequence for users who haven't picked an intent
    return [
      'create_customer',
      'create_job',
      'link_bank',
      'start_subscription'
    ];
  }

  switch (intent) {
    case 'job':
      return [
        'create_customer',
        'create_job',
        'schedule_job',
        'link_bank',
        'start_subscription'
      ];
    
    case 'quote':
      return [
        'create_customer',
        'create_quote',
        'send_quote',
        'link_bank',
        'start_subscription'
      ];
    
    case 'customer':
      return [
        'create_customer',
        'create_job',
        'link_bank',
        'start_subscription'
      ];
    
    case 'import':
      return [
        'create_customer', // Still show customer creation for import flow
        'create_job',
        'link_bank',
        'start_subscription'
      ];
    
    default:
      return [
        'create_customer',
        'create_job',
        'link_bank',
        'start_subscription'
      ];
  }
}