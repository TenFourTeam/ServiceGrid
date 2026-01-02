import { useAssessmentAutomationNotifications } from '@/hooks/useAssessmentAutomationNotifications';

/**
 * Provider component that initializes assessment automation notifications.
 * This listens to real-time events from ai_activity_log for assessment-related
 * automations (checklist creation, photo uploads, risk detection, etc.)
 * and surfaces them as toast notifications.
 */
export function AssessmentAutomationNotificationsProvider() {
  useAssessmentAutomationNotifications();
  return null;
}
