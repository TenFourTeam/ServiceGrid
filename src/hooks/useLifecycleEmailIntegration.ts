import { useCallback } from 'react';

/**
 * Hook that provides lifecycle email integration for mutations
 * DISABLED: Lifecycle emails are currently disabled
 */
export function useLifecycleEmailIntegration() {
  const triggerQuoteCreated = useCallback(() => {
    // Lifecycle emails disabled
    console.info('[useLifecycleEmailIntegration] Lifecycle emails are disabled');
  }, []);

  const triggerJobScheduled = useCallback(() => {
    // Lifecycle emails disabled
    console.info('[useLifecycleEmailIntegration] Lifecycle emails are disabled');
  }, []);

  const triggerInvoiceSent = useCallback(() => {
    // Lifecycle emails disabled
    console.info('[useLifecycleEmailIntegration] Lifecycle emails are disabled');
  }, []);

  return {
    triggerQuoteCreated,
    triggerJobScheduled,
    triggerInvoiceSent
  };
}