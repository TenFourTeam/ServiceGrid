import { useAuth } from '@/hooks/useBusinessAuth';
import { useAssessmentAutomationNotifications } from '@/hooks/useAssessmentAutomationNotifications';

/**
 * Provider component that initializes assessment automation notifications.
 * Only activates when user is authenticated to prevent hook errors when signed out.
 */
export function AssessmentAutomationNotificationsProvider() {
  const { isSignedIn } = useAuth();
  
  if (isSignedIn) {
    return <AssessmentAutomationNotificationsInner />;
  }
  
  return null;
}

function AssessmentAutomationNotificationsInner() {
  useAssessmentAutomationNotifications();
  return null;
}
