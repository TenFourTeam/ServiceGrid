import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useBusinessContext } from './useBusinessContext';
import { useProfile } from '@/queries/useProfile';
import { lifecycleEmailTriggers, getUserEngagementData, daysSinceSignup, daysSinceLastLogin } from '@/utils/lifecycleEmails';

/**
 * Hook to handle lifecycle email triggers based on user state and actions
 */
export function useLifecycleEmailTriggers() {
  const { isSignedIn, isLoaded } = useAuth();
  const { business, businessName, isLoadingBusiness } = useBusinessContext();
  const { data: profile } = useProfile();
  const hasTriggeredWelcome = useRef(false);
  const lastLoginCheck = useRef<string | null>(null);

  // Prepare email data - use business context for user ID
  const { userId } = useBusinessContext();
  const emailData = {
    userFullName: profile?.fullName,
    userEmail: business?.replyToEmail, // Use business email for now
    businessName: businessName || business?.name,
    businessId: business?.id,
    userId: userId,
    signupDate: business?.createdAt,
    lastLoginDate: new Date().toISOString() // Current time as proxy
  };

  // Welcome email trigger - send once on first successful login
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !profile || hasTriggeredWelcome.current || isLoadingBusiness) {
      return;
    }

    // Only send welcome email if we have basic user data
    if (emailData.userEmail && emailData.userId) {
      lifecycleEmailTriggers.sendWelcomeEmail(emailData);
      hasTriggeredWelcome.current = true;
      console.info('[useLifecycleEmailTriggers] Welcome email triggered');
    }
  }, [isLoaded, isSignedIn, profile, isLoadingBusiness, emailData.userEmail, emailData.userId]);

  // Simplified trigger - just send welcome for now
  // TODO: Add more sophisticated scheduling later

  // TODO: Add engagement recovery emails with proper user activity tracking

  return {
    emailData,
    // Export trigger functions for manual use in mutations
    triggerMilestoneEmail: {
      firstQuoteCreated: () => lifecycleEmailTriggers.sendFirstQuoteCreatedEmail(emailData),
      firstJobScheduled: () => lifecycleEmailTriggers.sendFirstJobScheduledEmail(emailData),
      firstInvoiceSent: () => lifecycleEmailTriggers.sendFirstInvoiceSentEmail(emailData),
      stripeConnected: () => lifecycleEmailTriggers.sendStripeConnectedEmail(emailData)
    }
  };
}