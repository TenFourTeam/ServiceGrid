import { useCallback } from 'react';
import { useLifecycleEmailTriggers } from './useLifecycleEmailTriggers';

/**
 * Hook that provides lifecycle email integration for mutations
 * Use this to trigger milestone emails when important actions happen
 */
export function useLifecycleEmailIntegration() {
  const { triggerMilestoneEmail } = useLifecycleEmailTriggers();

  const triggerQuoteCreated = useCallback(() => {
    try {
      triggerMilestoneEmail.firstQuoteCreated();
      console.info('[useLifecycleEmailIntegration] Quote created milestone triggered');
    } catch (error) {
      console.error('[useLifecycleEmailIntegration] Failed to trigger quote milestone:', error);
    }
  }, [triggerMilestoneEmail]);

  const triggerJobScheduled = useCallback(() => {
    try {
      triggerMilestoneEmail.firstJobScheduled();
      console.info('[useLifecycleEmailIntegration] Job scheduled milestone triggered');
    } catch (error) {
      console.error('[useLifecycleEmailIntegration] Failed to trigger job milestone:', error);
    }
  }, [triggerMilestoneEmail]);

  const triggerInvoiceSent = useCallback(() => {
    try {
      triggerMilestoneEmail.firstInvoiceSent();
      console.info('[useLifecycleEmailIntegration] Invoice sent milestone triggered');
    } catch (error) {
      console.error('[useLifecycleEmailIntegration] Failed to trigger invoice milestone:', error);
    }
  }, [triggerMilestoneEmail]);

  return {
    triggerQuoteCreated,
    triggerJobScheduled,
    triggerInvoiceSent
  };
}