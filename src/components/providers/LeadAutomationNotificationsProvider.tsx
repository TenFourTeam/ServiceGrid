import { useAuth } from '@clerk/clerk-react';
import { useLeadAutomationNotifications } from '@/hooks/useLeadAutomationNotifications';

/**
 * Provider component that initializes real-time lead automation notifications.
 * Only activates when user is authenticated.
 */
export function LeadAutomationNotificationsProvider() {
  const { isSignedIn } = useAuth();
  
  // Only subscribe when user is authenticated
  if (isSignedIn) {
    return <LeadAutomationNotificationsInner />;
  }
  
  return null;
}

function LeadAutomationNotificationsInner() {
  useLeadAutomationNotifications();
  return null;
}
