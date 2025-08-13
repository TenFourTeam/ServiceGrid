import { useCallback } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

interface OnboardingEvents {
  'onboarding_started': { source: string };
  'onboarding_step_completed': { step: string; timeToComplete?: number };
  'onboarding_completed': { totalTime: number; stepsCompleted: number };
  'customer_created': { source: 'onboarding' | 'manual' | 'csv_import'; method?: string };
  'quote_created': { hasCustomer: boolean; lineItemCount: number; source?: string };
  'job_created': { fromQuote: boolean; source?: string };
  'bank_linked': { timeFromSignup: number; source?: string };
  'subscription_started': { plan: string; trialDaysUsed: number };
  'trial_expired': { actionTaken: 'subscribed' | 'dismissed' | 'none' };
  'csv_import_started': { fileSize: number; estimatedRows: number };
  'csv_import_completed': { rowsProcessed: number; successCount: number; errorCount: number };
}

export function useAnalytics() {
  const { isSignedIn, userId } = useClerkAuth();

  const track = useCallback((event: keyof OnboardingEvents, properties?: OnboardingEvents[typeof event]) => {
    if (!isSignedIn) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        userId,
        timestamp: Date.now(),
        ...properties,
      },
      timestamp: Date.now(),
    };

    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', analyticsEvent);
      return;
    }

    // In production, you could send to your analytics service
    // Examples: PostHog, Mixpanel, Google Analytics, etc.
    try {
      // Example for PostHog:
      // posthog.capture(event, properties);
      
      // Example for custom analytics endpoint:
      // fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(analyticsEvent)
      // });

      // For now, store in localStorage for basic tracking
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push(analyticsEvent);
      // Keep only last 100 events to avoid storage bloat
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }, [isSignedIn, userId]);

  const getEvents = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('analytics_events') || '[]');
    } catch {
      return [];
    }
  }, []);

  const clearEvents = useCallback(() => {
    localStorage.removeItem('analytics_events');
  }, []);

  return {
    track,
    getEvents,
    clearEvents,
  };
}

// Helper hook for onboarding-specific analytics
export function useOnboardingAnalytics() {
  const { track } = useAnalytics();
  const startTime = Date.now();

  const trackStepCompleted = useCallback((step: string, stepStartTime?: number) => {
    track('onboarding_step_completed', {
      step,
      timeToComplete: stepStartTime ? Date.now() - stepStartTime : undefined,
    });
  }, [track]);

  const trackOnboardingCompleted = useCallback((stepsCompleted: number) => {
    track('onboarding_completed', {
      totalTime: Date.now() - startTime,
      stepsCompleted,
    });
  }, [track, startTime]);

  return {
    track,
    trackStepCompleted,
    trackOnboardingCompleted,
  };
}
