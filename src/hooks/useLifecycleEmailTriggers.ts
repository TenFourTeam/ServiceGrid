import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useBusinessContext } from './useBusinessContext';
import { useProfile } from '@/queries/useProfile';
import { useStripeConnectStatus } from './useStripeConnectStatus';
import { lifecycleEmailTriggers, getUserEngagementData, daysSinceSignup, daysSinceLastLogin } from '@/utils/lifecycleEmails';

/**
 * Hook to handle lifecycle email triggers based on user state and actions
 */
export function useLifecycleEmailTriggers() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { business, businessName, isLoadingBusiness } = useBusinessContext();
  const { data: profile } = useProfile();
  const { data: stripeStatus } = useStripeConnectStatus();
  const hasTriggeredWelcome = useRef(false);
  const hasTriggeredStripeConnected = useRef(false);
  const lastLoginCheck = useRef<string | null>(null);
  const lastEngagementCheck = useRef<string | null>(null);

  // Prepare email data - use business context for user ID
  const { userId } = useBusinessContext();
  const emailData = {
    userFullName: profile?.profile?.fullName,
    userEmail: business?.replyToEmail, // Use business email for now as profile doesn't have email
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
      lifecycleEmailTriggers.sendWelcomeEmail(emailData, () => getToken({ template: 'supabase' }));
      hasTriggeredWelcome.current = true;
      console.info('[useLifecycleEmailTriggers] Welcome email triggered');
    }
  }, [isLoaded, isSignedIn, profile, isLoadingBusiness, emailData.userEmail, emailData.userId]);

  // Stripe connection celebration trigger
  useEffect(() => {
    if (!stripeStatus || !emailData.userEmail || hasTriggeredStripeConnected.current) {
      return;
    }

    // Check if Stripe is newly connected (charges enabled and details submitted)
    if (stripeStatus.chargesEnabled && stripeStatus.detailsSubmitted) {
      lifecycleEmailTriggers.sendStripeConnectedEmail(emailData, () => getToken({ template: 'supabase' }));
      hasTriggeredStripeConnected.current = true;
      console.info('[useLifecycleEmailTriggers] Stripe connected email triggered');
    }
  }, [stripeStatus, emailData.userEmail]);

  // Time-based discovery emails (Day 3, 5, 10)
  useEffect(() => {
    if (!isSignedIn || !business?.createdAt || !emailData.userEmail) {
      return;
    }

    const daysSinceSignup = Math.floor(
      (Date.now() - new Date(business.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Day 3: Customer Management discovery
    if (daysSinceSignup >= 3 && daysSinceSignup < 4) {
      lifecycleEmailTriggers.sendFeatureDiscoveryEmail(emailData, () => getToken({ template: 'supabase' }), {
        feature: 'Customer Management',
        featureDescription: 'Organize your customer information',
        ctaUrl: '/customers',
        ctaText: 'Manage Customers'
      });
    }

    // Day 5: Calendar Integration discovery
    if (daysSinceSignup >= 5 && daysSinceSignup < 6) {
      lifecycleEmailTriggers.sendFeatureDiscoveryEmail(emailData, () => getToken({ template: 'supabase' }), {
        feature: 'Calendar Integration',
        featureDescription: 'Schedule and track your jobs',
        ctaUrl: '/calendar',
        ctaText: 'View Calendar'
      });
    }

    // Day 10: Case study/social proof
    if (daysSinceSignup >= 10 && daysSinceSignup < 11) {
      lifecycleEmailTriggers.sendFeatureDiscoveryEmail(emailData, () => getToken({ template: 'supabase' }), {
        feature: 'Success Stories',
        featureDescription: 'See how other businesses are growing',
        ctaUrl: '/quotes',
        ctaText: 'Create Your First Quote'
      });
    }
  }, [isSignedIn, business?.createdAt, emailData.userEmail]);

  // Engagement recovery emails (7-day, 14-day inactive)
  useEffect(() => {
    const checkEngagement = async () => {
      if (!isSignedIn || !emailData.userId || !emailData.userEmail) {
        return;
      }

      const now = new Date().toISOString();
      if (lastEngagementCheck.current === now.split('T')[0]) {
        return; // Already checked today
      }

      try {
        const engagementData = await getUserEngagementData(emailData.userId, () => getToken({ template: 'supabase' }));
        const daysSinceLogin = daysSinceLastLogin(engagementData.lastLoginDate);

        // 7-day inactive email
        if (daysSinceLogin >= 7 && daysSinceLogin < 8) {
          lifecycleEmailTriggers.sendEngagementRecoveryEmail(emailData, () => getToken({ template: 'supabase' }), {
            type: '7-day',
            lastActivity: engagementData.lastLoginDate
          });
        }

        // 14-day inactive email
        if (daysSinceLogin >= 14 && daysSinceLogin < 15) {
          lifecycleEmailTriggers.sendEngagementRecoveryEmail(emailData, () => getToken({ template: 'supabase' }), {
            type: '14-day',
            lastActivity: engagementData.lastLoginDate
          });
        }

        lastEngagementCheck.current = now.split('T')[0];
      } catch (error) {
        console.error('[useLifecycleEmailTriggers] Failed to check engagement:', error);
      }
    };

    // Check engagement daily when user is active
    if (isSignedIn) {
      checkEngagement();
    }
  }, [isSignedIn, emailData.userId, emailData.userEmail]);

  return {
    emailData,
    // Export trigger functions for manual use in mutations
    triggerMilestoneEmail: {
      firstQuoteCreated: () => lifecycleEmailTriggers.sendFirstQuoteCreatedEmail(emailData, () => getToken({ template: 'supabase' })),
      firstJobScheduled: () => lifecycleEmailTriggers.sendFirstJobScheduledEmail(emailData, () => getToken({ template: 'supabase' })),
      firstInvoiceSent: () => lifecycleEmailTriggers.sendFirstInvoiceSentEmail(emailData, () => getToken({ template: 'supabase' })),
      stripeConnected: () => lifecycleEmailTriggers.sendStripeConnectedEmail(emailData, () => getToken({ template: 'supabase' }))
    }
  };
}