import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@/hooks/useBusinessAuth';
import { useBusinessContext } from './useBusinessContext';
import { useStripeConnect } from './useStripeConnect';
import { useAuthApi } from './useAuthApi';
import { lifecycleEmailTriggers, daysSinceSignup, daysSinceLastLogin, LIFECYCLE_EMAIL_TYPES } from '@/utils/lifecycleEmails';

/**
 * Hook to handle lifecycle email triggers based on user state and actions
 * DISABLED: Lifecycle emails are currently disabled
 */
export function useLifecycleEmailTriggers(enableAutoTriggers: boolean = false) {
  // Force disable all auto triggers
  enableAutoTriggers = false;
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { business, businessName, isLoadingBusiness, profileFullName, userId, profileId } = useBusinessContext();
  const { status: stripeStatus } = useStripeConnect();
  const authApi = useAuthApi();
  const hasTriggeredWelcome = useRef(false);
  const hasTriggeredStripeConnected = useRef(false);
  const lastLoginCheck = useRef<string | null>(null);
  const lastEngagementCheck = useRef<string | null>(null);

  // Prepare email data - use user's actual email from profile
  const emailData = {
    userFullName: profileFullName,
    userEmail: user?.primaryEmailAddress?.emailAddress || business?.replyToEmail,
    businessName: businessName || business?.name,
    businessId: business?.id,
    userId: userId,
    signupDate: (business?.createdAt as string) || '',
    lastLoginDate: new Date().toISOString() // Current time as proxy
  };

  // Welcome email trigger - send once on first successful login
  useEffect(() => {
    if (!enableAutoTriggers || !isLoaded || !isSignedIn || !profileId || hasTriggeredWelcome.current || isLoadingBusiness) {
      return;
    }

    // Only send welcome email if we have basic user data
    if (emailData.userEmail && emailData.userId) {
      lifecycleEmailTriggers.sendWelcomeEmail(emailData, authApi);
      hasTriggeredWelcome.current = true;
      console.info('[useLifecycleEmailTriggers] Welcome email triggered');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableAutoTriggers, isLoaded, isSignedIn, profileId, isLoadingBusiness, emailData.userEmail, emailData.userId]);

  // Stripe connection celebration trigger
  useEffect(() => {
    if (!enableAutoTriggers || !stripeStatus || !emailData.userEmail || hasTriggeredStripeConnected.current) {
      return;
    }

    // Check if Stripe is newly connected (charges enabled and details submitted)
    if (stripeStatus.chargesEnabled && stripeStatus.detailsSubmitted) {
      lifecycleEmailTriggers.sendStripeConnectedEmail(emailData, authApi);
      hasTriggeredStripeConnected.current = true;
      console.info('[useLifecycleEmailTriggers] Stripe connected email triggered');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableAutoTriggers, stripeStatus, emailData.userEmail]);

  // Time-based discovery emails (Day 3, 5, 10)
  useEffect(() => {
    if (!enableAutoTriggers || !isSignedIn || !business?.createdAt || !emailData.userEmail) {
      return;
    }

    const daysSinceSignup = Math.floor(
      (Date.now() - new Date(business.createdAt as string).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Day 3: Customer Management discovery
    if (daysSinceSignup >= 3 && daysSinceSignup < 4) {
      lifecycleEmailTriggers.sendFeatureDiscoveryEmail(emailData, authApi, {
        emailType: LIFECYCLE_EMAIL_TYPES.FEATURE_DISCOVERY_CUSTOMERS,
        feature: 'Customer Management',
        featureDescription: 'Organize your customer information',
        ctaUrl: '/customers',
        ctaText: 'Manage Customers',
        daysFromSignup: 3
      });
    }

    // Day 5: Calendar Integration discovery
    if (daysSinceSignup >= 5 && daysSinceSignup < 6) {
      lifecycleEmailTriggers.sendFeatureDiscoveryEmail(emailData, authApi, {
        emailType: LIFECYCLE_EMAIL_TYPES.FEATURE_DISCOVERY_CALENDAR,
        feature: 'Calendar Integration',
        featureDescription: 'Schedule and track your jobs',
        ctaUrl: '/calendar',
        ctaText: 'View Calendar',
        daysFromSignup: 5
      });
    }

    // Day 10: Case study/social proof
    if (daysSinceSignup >= 10 && daysSinceSignup < 11) {
      lifecycleEmailTriggers.sendFeatureDiscoveryEmail(emailData, authApi, {
        emailType: LIFECYCLE_EMAIL_TYPES.FEATURE_DISCOVERY_SUCCESS,
        feature: 'Success Stories',
        featureDescription: 'See how other businesses are growing',
        ctaUrl: '/quotes',
        ctaText: 'Create Your First Quote',
        daysFromSignup: 10
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableAutoTriggers, isSignedIn, business?.createdAt, emailData.userEmail]);

  // Engagement recovery emails (7-day, 14-day inactive)
  useEffect(() => {
    const checkEngagement = async () => {
      if (!enableAutoTriggers || !isSignedIn || !emailData.userId || !emailData.userEmail) {
        return;
      }

      const now = new Date().toISOString();
      if (lastEngagementCheck.current === now.split('T')[0]) {
        return; // Already checked today
      }

      try {
        // Simplified: Send engagement emails based on business creation date
        const daysSinceSignup = Math.floor(
          (Date.now() - new Date(business.createdAt as string).getTime()) / (1000 * 60 * 60 * 24)
        );

        // 7-day inactive email
        if (daysSinceSignup >= 7 && daysSinceSignup < 8) {
          lifecycleEmailTriggers.sendEngagementRecoveryEmail(emailData, authApi, {
            type: '7-day',
            lastActivity: business.createdAt as string
          });
        }

        // 14-day inactive email
        if (daysSinceSignup >= 14 && daysSinceSignup < 15) {
          lifecycleEmailTriggers.sendEngagementRecoveryEmail(emailData, authApi, {
            type: '14-day',
            lastActivity: business.createdAt as string
          });
        }

        lastEngagementCheck.current = now.split('T')[0];
      } catch (error) {
        console.error('[useLifecycleEmailTriggers] Failed to check engagement:', error);
      }
    };

    // Check engagement daily when user is active
    if (enableAutoTriggers && isSignedIn) {
      checkEngagement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableAutoTriggers, isSignedIn, emailData.userId, emailData.userEmail]);

  return {
    emailData,
    // Export trigger functions for manual use in mutations
    triggerMilestoneEmail: {
      firstQuoteCreated: () => lifecycleEmailTriggers.sendFirstQuoteCreatedEmail(emailData, authApi),
      firstJobScheduled: () => lifecycleEmailTriggers.sendFirstJobScheduledEmail(emailData, authApi),
      firstInvoiceSent: () => lifecycleEmailTriggers.sendFirstInvoiceSentEmail(emailData, authApi),
      stripeConnected: () => lifecycleEmailTriggers.sendStripeConnectedEmail(emailData, authApi)
    }
  };
}