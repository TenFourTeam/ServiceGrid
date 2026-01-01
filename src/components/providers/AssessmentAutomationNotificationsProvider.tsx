import { useAssessmentAutomationNotifications } from '@/hooks/useAssessmentAutomationNotifications';

/**
 * Provider component that initializes assessment automation notifications.
 * Hook is always called (for React hook integrity), but guards internally.
 */
export function AssessmentAutomationNotificationsProvider() {
  useAssessmentAutomationNotifications();
  return null;
}
