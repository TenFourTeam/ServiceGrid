export type OnboardingStep =
  | 'welcome_intent'
  | 'create_job'
  | 'create_quote'
  | 'create_customer'
  | 'link_bank'
  | 'send_quote'
  | 'schedule_job'
  | 'start_subscription';

export type OnboardingIntent = 'job' | 'quote' | 'customer' | 'import';

export interface OnboardingProgress {
  currentStep?: OnboardingStep;
  completedSteps: Record<OnboardingStep, boolean>;
  intent?: OnboardingIntent;
  dismissedHints: string[];
  lastSeenAt: string;
  isPaused: boolean;
}

export interface OnboardingStepConfig {
  id: OnboardingStep;
  route: string;
  selector?: string;
  title: string;
  hint: string;
  guard: (context: any) => boolean; // Changed from async Promise<boolean> to sync boolean
  onAdvance?: () => void;
  canSkip?: boolean;
  mobileUI?: 'sheet' | 'tooltip';
  analyticsId: string;
  requiresAuth?: boolean;
}