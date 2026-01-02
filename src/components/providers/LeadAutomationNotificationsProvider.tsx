import { useLeadAutomationNotifications } from '@/hooks/useLeadAutomationNotifications';

/**
 * Provider component that initializes real-time lead automation notifications.
 * Hook is always called (for React hook integrity), but guards internally.
 */
export function LeadAutomationNotificationsProvider() {
  useLeadAutomationNotifications();
  return null;
}
